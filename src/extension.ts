import * as vscode from 'vscode';
import { DompilePreviewProvider } from './preview/previewProvider';
import { DompileDefinitionProvider } from './providers/definitionProvider';
import { DompileCompletionProvider } from './providers/completionProvider';
import { DompileHoverProvider } from './providers/hoverProvider';
import { DompileDiagnostics } from './diagnostics/diagnostics';
import { ExtensionContext } from './types';

let context: ExtensionContext;

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('DOMpile extension is being activated');

    // Initialize extension context
    context = {
        extensionContext,
        outputChannel: vscode.window.createOutputChannel('DOMpile'),
        diagnostics: vscode.languages.createDiagnosticCollection('dompile'),
        previewProvider: undefined,
        isActive: false
    };

    // Check if this is a DOMpile workspace
    checkDompileWorkspace().then(isActive => {
        context.isActive = isActive;
        vscode.commands.executeCommand('setContext', 'dompile.isActive', isActive);
        
        if (isActive) {
            initializeDompileFeatures();
        }
    });

    // Register commands
    registerCommands();

    // Watch for workspace changes
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        checkDompileWorkspace().then(isActive => {
            context.isActive = isActive;
            vscode.commands.executeCommand('setContext', 'dompile.isActive', isActive);
            
            if (isActive && !context.previewProvider) {
                initializeDompileFeatures();
            }
        });
    });

    extensionContext.subscriptions.push(workspaceWatcher);

    context.outputChannel.appendLine('DOMpile extension activated');
}

async function checkDompileWorkspace(): Promise<boolean> {
    if (!vscode.workspace.workspaceFolders) {
        return false;
    }

    // Check for DOMpile indicators
    const patterns = [
        '**/package.json',
        '**/dompile.config.*',
        '**/src/**/*.html',
        '**/components/**/*.html',
        '**/layouts/**/*.html'
    ];

    for (const pattern of patterns) {
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
        if (files.length > 0) {
            // Additional check for DOMpile specific content
            if (pattern.includes('package.json')) {
                try {
                    const content = await vscode.workspace.fs.readFile(files[0]);
                    const packageJson = JSON.parse(content.toString());
                    if (packageJson.dependencies?.['@dompile/cli'] || 
                        packageJson.devDependencies?.['@dompile/cli'] ||
                        packageJson.scripts?.build?.includes('dompile') ||
                        packageJson.scripts?.serve?.includes('dompile')) {
                        return true;
                    }
                }
                catch {
                    // Continue checking other indicators
                }
            } else {
                return true;
            }
        }
    }

    return false;
}

function initializeDompileFeatures() {
    if (!context.extensionContext) {
        return;
    }

    context.outputChannel.appendLine('Initializing DOMpile features');

    // Initialize preview provider
    context.previewProvider = new DompilePreviewProvider(context);

    // Initialize diagnostics
    const diagnostics = new DompileDiagnostics(context);

    // Register language providers
    const definitionProvider = new DompileDefinitionProvider(context);
    const completionProvider = new DompileCompletionProvider(context);
    const hoverProvider = new DompileHoverProvider(context);

    const subscriptions = [
        // Language providers
        vscode.languages.registerDefinitionProvider(
            { scheme: 'file', language: 'html' },
            definitionProvider
        ),
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'html' },
            completionProvider,
            '"', '/', '.'
        ),
        vscode.languages.registerHoverProvider(
            { scheme: 'file', language: 'html' },
            hoverProvider
        ),

        // File watchers for live diagnostics
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === 'html') {
                diagnostics.updateDiagnostics(e.document);
            }
        }),
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId === 'html') {
                diagnostics.updateDiagnostics(document);
                context.previewProvider?.refresh();
            }
        })
    ];

    context.extensionContext.subscriptions.push(...subscriptions);
}

function registerCommands() {
    if (!context.extensionContext) {
        return;
    }

    const commands = [
        vscode.commands.registerCommand('dompile.openPreview', () => {
            if (!context.isActive) {
                vscode.window.showWarningMessage('DOMpile preview is only available in DOMpile projects');
                return;
            }
            
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            if (!context.previewProvider) {
                initializeDompileFeatures();
            }

            context.previewProvider?.showPreview(editor.document);
        }),

        vscode.commands.registerCommand('dompile.previewToSide', () => {
            if (!context.isActive) {
                vscode.window.showWarningMessage('DOMpile preview is only available in DOMpile projects');
                return;
            }

            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            if (!context.previewProvider) {
                initializeDompileFeatures();
            }

            context.previewProvider?.showPreviewToSide(editor.document);
        }),

        vscode.commands.registerCommand('dompile.refreshPreview', () => {
            if (context.previewProvider) {
                context.previewProvider.refresh();
            }
        })
    ];

    context.extensionContext.subscriptions.push(...commands);
}

export function deactivate() {
    if (context?.diagnostics) {
        context.diagnostics.clear();
    }
    if (context?.outputChannel) {
        context.outputChannel.dispose();
    }
}