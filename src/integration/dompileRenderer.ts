import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DompileRenderResult, DompileConfig } from '../types';

// Import DOMpile CLI functions
let dompileCore: any;

try {
    // Try to import the DOMpile CLI
    dompileCore = require('@dompile/cli/src/core/file-processor.js');
} catch (error) {
    console.warn('DOMpile CLI not found, using fallback renderer');
}

export class DompileRenderer {
    private config: DompileConfig;
    private workspaceRoot: string;

    constructor(workspaceRoot: string, config?: Partial<DompileConfig>) {
        this.workspaceRoot = workspaceRoot;
        this.config = {
            source: 'src',
            output: 'dist',
            includes: 'includes',
            baseUrl: 'https://example.com',
            prettyUrls: false,
            ...config
        };
    }

    async renderDocument(document: vscode.TextDocument): Promise<DompileRenderResult> {
        const diagnostics: vscode.Diagnostic[] = [];
        const dependencies: string[] = [];
        const assets: string[] = [];

        try {
            if (dompileCore) {
                return await this.renderWithCLI(document, diagnostics, dependencies, assets);
            } else {
                return await this.renderFallback(document, diagnostics, dependencies, assets);
            }
        } catch (error) {
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 0),
                `Render error: ${error instanceof Error ? error.message : String(error)}`,
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);

            return {
                html: this.createErrorHTML(error instanceof Error ? error.message : String(error)),
                diagnostics,
                dependencies,
                assets
            };
        }
    }

    private async renderWithCLI(
        document: vscode.TextDocument,
        diagnostics: vscode.Diagnostic[],
        dependencies: string[],
        assets: string[]
    ): Promise<DompileRenderResult> {
        const { processIncludes } = require('@dompile/cli/src/core/include-processor.js');
        const { injectHeadContent, getHeadSnippet } = require('@dompile/cli/src/core/head-injector.js');
        const { DependencyTracker } = require('@dompile/cli/src/core/dependency-tracker.js');
        const { processMarkdown, isMarkdownFile } = require('@dompile/cli/src/core/markdown-processor.js');

        const filePath = document.fileName;
        const content = document.getText();
        const sourceRoot = path.join(this.workspaceRoot, this.config.source);
        const dependencyTracker = new DependencyTracker();

        let processedContent = content;

        try {
            // Handle markdown files
            if (isMarkdownFile(filePath)) {
                const result = await processMarkdown(content, filePath, sourceRoot, {
                    prettyUrls: this.config.prettyUrls
                });
                processedContent = result.html;
                
                // Add markdown dependencies
                if (result.layout) {
                    dependencies.push(result.layout);
                }
            }

            // Process includes
            processedContent = await processIncludes(
                processedContent,
                filePath,
                sourceRoot,
                new Set(),
                0,
                dependencyTracker
            );

            // Get dependencies from tracker
            const fileDependencies = dependencyTracker.getDependencies(filePath);
            dependencies.push(...fileDependencies);

            // Inject head content
            const headSnippet = await getHeadSnippet(sourceRoot, this.config.includes, this.config.head);
            if (headSnippet) {
                processedContent = injectHeadContent(processedContent, headSnippet);
            }

            return {
                html: processedContent,
                diagnostics,
                dependencies,
                assets
            };

        } catch (error) {
            // Handle specific DOMpile errors
            if (error instanceof Error) {
                const diagnostic = this.createDiagnosticFromError(error, document);
                diagnostics.push(diagnostic);
            }

            return {
                html: this.createErrorHTML(error instanceof Error ? error.message : String(error)),
                diagnostics,
                dependencies,
                assets
            };
        }
    }

    private async renderFallback(
        document: vscode.TextDocument,
        diagnostics: vscode.Diagnostic[],
        dependencies: string[],
        assets: string[]
    ): Promise<DompileRenderResult> {
        // Simple fallback renderer for basic include processing
        let content = document.getText();
        const filePath = document.fileName;
        const sourceRoot = path.join(this.workspaceRoot, this.config.source);

        // Basic include processing using regex
        const includeRegex = /<!--#include\s+(virtual|file)=\"([^\"]+)\"\s*-->/gi;
        let match;

        while ((match = includeRegex.exec(content)) !== null) {
            const [fullMatch, type, includePath] = match;
            const range = document.positionAt(match.index);
            
            try {
                let resolvedPath: string;
                
                if (type === 'virtual') {
                    resolvedPath = path.join(sourceRoot, includePath);
                } else {
                    resolvedPath = path.resolve(path.dirname(filePath), includePath);
                }

                if (fs.existsSync(resolvedPath)) {
                    const includeContent = fs.readFileSync(resolvedPath, 'utf-8');
                    content = content.replace(fullMatch, includeContent);
                    dependencies.push(resolvedPath);
                } else {
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(range, range),
                        `Include file not found: ${includePath}`,
                        vscode.DiagnosticSeverity.Error
                    );
                    diagnostics.push(diagnostic);
                    content = content.replace(fullMatch, `<!-- Include not found: ${includePath} -->`);
                }
            } catch (error) {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(range, range),
                    `Error processing include: ${error instanceof Error ? error.message : String(error)}`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            }
        }

        return {
            html: content,
            diagnostics,
            dependencies,
            assets
        };
    }

    private createDiagnosticFromError(error: Error, document: vscode.TextDocument): vscode.Diagnostic {
        // Try to extract line information from error message
        const lineMatch = error.message.match(/line (\d+)/i);
        let range = new vscode.Range(0, 0, 0, 0);

        if (lineMatch) {
            const lineNumber = parseInt(lineMatch[1]) - 1;
            if (lineNumber >= 0 && lineNumber < document.lineCount) {
                const line = document.lineAt(lineNumber);
                range = new vscode.Range(lineNumber, 0, lineNumber, line.text.length);
            }
        }

        let severity = vscode.DiagnosticSeverity.Error;
        if (error.message.includes('warning') || error.message.includes('deprecated')) {
            severity = vscode.DiagnosticSeverity.Warning;
        }

        return new vscode.Diagnostic(range, error.message, severity);
    }

    private createErrorHTML(message: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>DOMpile Preview Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            background: #f5f5f5;
            color: #333;
        }
        .error {
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
        }
        .error h2 {
            color: #c33;
            margin-top: 0;
        }
        pre {
            background: #f8f8f8;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>DOMpile Preview Error</h1>
    <div class="error">
        <h2>Rendering Failed</h2>
        <pre>${this.escapeHtml(message)}</pre>
    </div>
    <p>Check the VS Code Problems panel for more details.</p>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    updateConfig(config: Partial<DompileConfig>) {
        this.config = { ...this.config, ...config };
    }

    getConfig(): DompileConfig {
        return { ...this.config };
    }
}