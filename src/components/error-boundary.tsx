"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** 全局错误边界 — 捕获子组件渲染异常并展示降级 UI */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <AlertTriangle size={48} className="text-warning" />
          <h2 className="text-lg font-semibold">出现了一些问题</h2>
          <p className="text-sm text-default-500 text-center max-w-md">
            应用遇到了意外错误，请尝试重新加载。
          </p>
          {this.state.error && (
            <details className="text-xs text-default-400 max-w-lg w-full">
              <summary className="cursor-pointer hover:text-default-600">错误详情</summary>
              <pre className="mt-2 p-2 bg-default-100 rounded overflow-x-auto whitespace-pre-wrap">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <Button color="primary" onPress={this.handleReload}>
            重新加载
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
