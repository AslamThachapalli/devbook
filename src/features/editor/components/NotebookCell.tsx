import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { whiteLight } from "@uiw/codemirror-theme-white";
import { noctisLilac } from "@uiw/codemirror-theme-noctis-lilac";
import React, { useImperativeHandle, useState } from "react";
import { IconButton } from "../../../components";
import {
    ArrowDown,
    ArrowDownToLine,
    ArrowUp,
    ArrowUpFromLine,
    Trash,
} from "lucide-react";

export type CellType = "markdown" | "code";

type CodeCellOutput = { type: "stdout" | "stderr"; data: string };

export interface Cell {
    id: string;
    type: CellType;
    source: string;
    output?: CodeCellOutput;
}

export type CellExecutedOutput = { cellId: string } & (
    | {
          cellType: "markdown";
      }
    | {
          cellType: "code";
          output?: CodeCellOutput;
      }
);

export interface NotebookCellProps {
    cell: Cell;
    isActive: boolean;
    onChange: (source: string) => void;
    onClick: () => void;
    language?: "js" | "ts";
    onCellExecuted?: (output: CellExecutedOutput) => void;
    isExecuting?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onAddAbove?: () => void;
    onAddBelow?: () => void;
    onDelete?: () => void;
}

export interface NotebookCellRef {
    executeCell: () => void;
}

export const NotebookCell = React.forwardRef<
    NotebookCellRef,
    NotebookCellProps
>((props, ref) => {
    const {
        cell,
        isActive,
        onChange,
        onClick,
        language,
        onCellExecuted,
        isExecuting = false,
        onMoveUp,
        onMoveDown,
        onAddAbove,
        onAddBelow,
        onDelete,
    } = props;

    useImperativeHandle(ref, () => ({
        executeCell,
    }));

    const [cellHeight, setCellHeight] = useState<"25px" | undefined>(undefined);
    const [showMarkdown, setShowMarkdown] = useState(false);

    const extensions = (() => {
        if (cell.type === "markdown") {
            return [
                markdown({
                    base: markdownLanguage,
                    codeLanguages: languages,
                }),
            ];
        } else {
            if (language === "js") {
                return [javascript()];
            } else if (language === "ts") {
                return [javascript({ typescript: true })];
            } else {
                return [javascript()];
            }
        }
    })();

    const theme = cell.type === "markdown" ? whiteLight : noctisLilac;

    function handleSidePanelClick() {
        setCellHeight(cellHeight === "25px" ? undefined : "25px");
    }

    function handleCellClick() {
        onClick();
        setCellHeight(undefined);
    }

    function handleMarkdownDoubleClick() {
        if (cell.type === "markdown") {
            setShowMarkdown(false);
        }
    }

    function executeCell() {
        if (cell.type === "markdown") {
            setShowMarkdown(true);
            onCellExecuted?.({ cellId: cell.id, cellType: "markdown" });
        } else {
            onCellExecuted?.({
                cellId: cell.id,
                cellType: "code",
                output: { type: "stdout", data: "Hello, world!" },
            });
        }
    }

    return (
        <div className="flex items-stretch gap-4 mb-2">
            <span
                className={`w-1.5 bg-blue-500 hover:bg-blue-800 cursor-pointer ${
                    isActive ? "visible" : "invisible"
                }`}
                onClick={handleSidePanelClick}
            ></span>
            <div className="flex-1 relative">
                {!showMarkdown && (
                    <div
                        className={`relative border rounded-lg overflow-hidden bg-white cursor-pointer transition-colors ${
                            isActive
                                ? "border-blue-500 shadow-md"
                                : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={handleCellClick}
                    >
                        <CodeMirror
                            value={cell.source}
                            extensions={extensions}
                            onChange={onChange}
                            theme={theme}
                            height={cellHeight}
                            minHeight="30px"
                        />
                    </div>
                )}
                {cell.type === "markdown" && showMarkdown && (
                    <div
                        onDoubleClick={handleMarkdownDoubleClick}
                        onClick={handleCellClick}
                    >
                        <article className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-2">
                            <Markdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                    code({
                                        node,
                                        inline,
                                        className,
                                        children,
                                        ...props
                                    }: any) {
                                        const match = /language-(\w+)/.exec(
                                            className || ""
                                        );
                                        return !inline && match ? (
                                            <pre className="text-gray-100 p-2 rounded-lg overflow-x-auto mb-4">
                                                <code
                                                    className={`text-[12px]`}
                                                    {...props}
                                                >
                                                    {children}
                                                </code>
                                            </pre>
                                        ) : (
                                            <span
                                                className={`bg-gray-200 rounded font-mono px-1`}
                                                {...props}
                                            >
                                                {children}
                                            </span>
                                        );
                                    },
                                }}
                            >
                                {cell.source}
                            </Markdown>
                        </article>
                    </div>
                )}
                {cell.type === "code" && (
                    <div className="mt-2">
                        {isExecuting && (
                            <div className="text-gray-400 text-sm italic">
                                Executing...
                            </div>
                        )}
                        {cell.output && !isExecuting && (
                            <div
                                className={`text-sm ${
                                    cell.output.type === "stderr"
                                        ? "text-red-600"
                                        : "text-gray-500"
                                }`}
                            >
                                {cell.output.data}
                            </div>
                        )}
                    </div>
                )}
                {((cell.type === "code" && isActive) ||
                    (cell.type === "markdown" &&
                        !showMarkdown &&
                        isActive)) && (
                    <div
                        className="flex items-center gap-1 absolute top-1 right-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* <IconButton
                            icon={<Play size={16} />}
                            onClick={executeCell}
                            disabled={isExecuting}
                        /> */}
                        <IconButton
                            icon={<ArrowUp size={16} />}
                            onClick={() => onMoveUp?.()}
                            hintText="Move cell up"
                        />
                        <IconButton
                            icon={<ArrowDown size={16} />}
                            onClick={() => onMoveDown?.()}
                            hintText="Move cell down"
                        />
                        <IconButton
                            icon={<ArrowUpFromLine size={16} />}
                            onClick={() => onAddAbove?.()}
                            hintText="Add cell above"
                        />
                        <IconButton
                            icon={<ArrowDownToLine size={16} />}
                            onClick={() => onAddBelow?.()}
                            hintText="Add cell below"
                        />
                        <IconButton
                            icon={<Trash size={16} />}
                            onClick={() => onDelete?.()}
                            hintText="Delete cell"
                        />
                    </div>
                )}
            </div>
        </div>
    );
});
