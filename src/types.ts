import * as vscode from 'vscode';
import { DompilePreviewProvider } from './preview/previewProvider';

export interface ExtensionContext {
    extensionContext: vscode.ExtensionContext;
    outputChannel: vscode.OutputChannel;
    diagnostics: vscode.DiagnosticCollection;
    previewProvider: DompilePreviewProvider | undefined;
    isActive: boolean;
}

export interface DompileConfig {
    source: string;
    output: string;
    includes: string;
    head?: string;
    baseUrl?: string;
    prettyUrls?: boolean;
}

export interface DompileRenderResult {
    html: string;
    diagnostics: vscode.Diagnostic[];
    dependencies: string[];
    assets: string[];
}

export interface IncludeInfo {
    type: 'virtual' | 'file';
    path: string;
    range: vscode.Range;
    resolvedPath?: string;
    exists?: boolean;
}

export interface TemplateInfo {
    extends?: string;
    slots: SlotInfo[];
    range: vscode.Range;
}

export interface SlotInfo {
    name: string;
    range: vscode.Range;
    content?: string;
}

export interface DompileDiagnosticData {
    type: 'include' | 'template' | 'slot' | 'layout';
    message: string;
    severity: vscode.DiagnosticSeverity;
    path?: string;
    suggestions?: string[];
}

export interface NavigationTarget {
    uri: vscode.Uri;
    range: vscode.Range;
    description?: string;
}

export interface CompletionContext {
    type: 'include-path' | 'slot-name' | 'template-extends';
    prefix: string;
    range: vscode.Range;
}