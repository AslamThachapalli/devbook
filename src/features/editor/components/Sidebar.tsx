import React, { useState, useEffect, useRef } from "react";
import {
    FileText,
    Folder,
    FolderOpen,
    Plus,
    ChevronRight,
    ChevronDown,
    MoreVertical,
    Trash2,
} from "lucide-react";
import {
    getAllNotebooks,
    deleteNotebook,
    type Notebook,
} from "../../../services/apis";
import { useAppDispatch, useAppSelector } from "../../../applicationState";
import {
    openNotebook,
    closeNotebook,
} from "../../../applicationState/editorSlice";
import { getNotebookByPath } from "../../../services/apis";
import { CreateNotebookDialog } from "./CreateNotebookDialog";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { Menu, type MenuItem } from "../../../components/Menu";
import { Dialog, Button } from "../../../components";
import { AlertTriangle } from "lucide-react";

interface TreeNode {
    name: string;
    path: string;
    type: "notebook" | "folder";
    children?: TreeNode[];
}

interface SidebarTreeNodeProps {
    node: TreeNode;
    level: number;
    isExpanded: boolean;
    isActive: boolean;
    expandedFolders: Set<string>;
    activeNotebookPath: string | null;
    onToggleFolder: (path: string) => void;
    onDoubleClick: (node: TreeNode) => void;
    onCreateNotebook: (parentPath: string) => void;
    onCreateFolder: (parentPath: string) => void;
    onMenuClick: (
        node: TreeNode,
        ref: React.RefObject<HTMLButtonElement | null>
    ) => void;
}

function buildTree(notebooks: Notebook[]): TreeNode[] {
    const tree: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();

    // Sort notebooks by path for consistent ordering
    const sorted = [...notebooks].sort((a, b) => a.path.localeCompare(b.path));

    for (const notebook of sorted) {
        const parts = notebook.path.split("/");
        let currentPath = "";
        let currentLevel = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (isLast) {
                // This is the notebook itself
                const node: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: "notebook",
                };
                currentLevel.push(node);
            } else {
                // This is a folder
                let folderNode = pathMap.get(currentPath);
                if (!folderNode) {
                    folderNode = {
                        name: part,
                        path: currentPath,
                        type: "folder",
                        children: [],
                    };
                    pathMap.set(currentPath, folderNode);
                    currentLevel.push(folderNode);
                }
                currentLevel = folderNode.children!;
            }
        }
    }

    return tree;
}

function SidebarTreeNode({
    node,
    level,
    isExpanded,
    isActive,
    expandedFolders,
    activeNotebookPath,
    onToggleFolder,
    onDoubleClick,
    onCreateNotebook,
    onCreateFolder,
    onMenuClick,
}: SidebarTreeNodeProps) {
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const isFolder = node.type === "folder";

    function handleContextMenu(e: React.MouseEvent) {
        e.preventDefault();
        if (isFolder) {
            // Could show context menu here in the future
        }
    }

    function handleMenuClick(e: React.MouseEvent) {
        e.stopPropagation();
        if (!isFolder) {
            onMenuClick(node, menuButtonRef);
        }
    }

    return (
        <div key={node.path} className="group">
            <div
                className={`flex items-center gap-1 px-2 py-1 hover:bg-gray-100 cursor-pointer select-none ${
                    isActive ? "bg-blue-50 hover:bg-blue-100" : ""
                } ${level > 0 ? `ml-${level * 4}` : ""}`}
                style={{ paddingLeft: `${8 + level * 16}px` }}
                onDoubleClick={() => onDoubleClick(node)}
                onClick={() => {
                    if (isFolder) {
                        onToggleFolder(node.path);
                    }
                }}
                onContextMenu={handleContextMenu}
            >
                {isFolder ? (
                    <>
                        {isExpanded ? (
                            <ChevronDown size={14} className="text-gray-600" />
                        ) : (
                            <ChevronRight size={14} className="text-gray-600" />
                        )}
                        {isExpanded ? (
                            <FolderOpen size={16} className="text-blue-500" />
                        ) : (
                            <Folder size={16} className="text-blue-500" />
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-[14px]" />{" "}
                        {/* Spacer for alignment */}
                        <FileText
                            size={16}
                            className={
                                isActive ? "text-blue-600" : "text-gray-600"
                            }
                        />
                    </>
                )}
                <span
                    className={`text-sm flex-1 ${
                        isActive ? "text-blue-900 font-medium" : "text-gray-700"
                    }`}
                >
                    {node.name}
                </span>
                {isFolder ? (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                            className="p-0.5 hover:bg-gray-200 rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateNotebook(node.path);
                            }}
                            title="New Notebook in Folder"
                        >
                            <Plus size={12} className="text-gray-600" />
                        </button>
                        <button
                            className="p-0.5 hover:bg-gray-200 rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreateFolder(node.path);
                            }}
                            title="New Folder in Folder"
                        >
                            <Plus size={12} className="text-gray-600" />
                        </button>
                    </div>
                ) : (
                    <button
                        ref={menuButtonRef}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity"
                        onClick={handleMenuClick}
                        title="More options"
                    >
                        <MoreVertical size={14} className="text-gray-600" />
                    </button>
                )}
            </div>
            {isFolder && isExpanded && node.children && (
                <div>
                    {node.children.map((child) => (
                        <SidebarTreeNode
                            key={child.path}
                            node={child}
                            level={level + 1}
                            isExpanded={expandedFolders.has(child.path)}
                            isActive={
                                child.type === "notebook" &&
                                child.path === activeNotebookPath
                            }
                            expandedFolders={expandedFolders}
                            activeNotebookPath={activeNotebookPath}
                            onToggleFolder={onToggleFolder}
                            onDoubleClick={onDoubleClick}
                            onCreateNotebook={onCreateNotebook}
                            onCreateFolder={onCreateFolder}
                            onMenuClick={onMenuClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function Sidebar() {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
        new Set()
    );
    const [showCreateNotebook, setShowCreateNotebook] = useState(false);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [createParentPath, setCreateParentPath] = useState<
        string | undefined
    >();
    const [menuAnchor, setMenuAnchor] = useState<{
        ref: React.RefObject<HTMLElement | null>;
        items: MenuItem[];
    } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        path: string;
        name: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const dispatch = useAppDispatch();
    const activeNotebookPath = useAppSelector(
        (state) => state.editorSlice.activeNotebookPath
    );

    useEffect(() => {
        loadNotebooks();
    }, []);

    async function loadNotebooks() {
        const notebooks = await getAllNotebooks();
        const treeData = buildTree(notebooks);
        setTree(treeData);
    }

    function toggleFolder(path: string) {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }

    async function handleDoubleClick(node: TreeNode) {
        if (node.type === "notebook") {
            const notebook = await getNotebookByPath(node.path);
            if (notebook) {
                // Expand all parent folders
                const pathParts = node.path.split("/");
                const foldersToExpand = new Set<string>();
                let currentPath = "";
                for (let i = 0; i < pathParts.length - 1; i++) {
                    currentPath = currentPath
                        ? `${currentPath}/${pathParts[i]}`
                        : pathParts[i];
                    foldersToExpand.add(currentPath);
                }
                setExpandedFolders((prev) => {
                    const next = new Set(prev);
                    foldersToExpand.forEach((path) => next.add(path));
                    return next;
                });

                dispatch(
                    openNotebook({
                        path: notebook.path,
                        name: notebook.name,
                        language: notebook.language,
                        cells: notebook.cells,
                        hasUnsavedChanges: false,
                    })
                );
            }
        } else {
            toggleFolder(node.path);
        }
    }

    function handleMenuClick(
        node: TreeNode,
        ref: React.RefObject<HTMLButtonElement | null>
    ) {
        const menuItems: MenuItem[] = [
            {
                id: "delete",
                label: "Delete",
                icon: <Trash2 size={14} />,
                onClick: () => {
                    setDeleteConfirm({
                        isOpen: true,
                        path: node.path,
                        name: node.name,
                    });
                },
                danger: true,
            },
        ];

        setMenuAnchor({
            ref: ref as React.RefObject<HTMLElement | null>,
            items: menuItems,
        });
    }

    function handleCreateNotebook(parentPath?: string) {
        setCreateParentPath(parentPath);
        setShowCreateNotebook(true);
    }

    function handleCreateFolder(parentPath?: string) {
        setCreateParentPath(parentPath);
        setShowCreateFolder(true);
    }

    function handleCreateSuccess() {
        loadNotebooks();
    }

    async function handleDeleteConfirm() {
        if (!deleteConfirm) return;

        setIsDeleting(true);
        try {
            // Close the notebook if it's currently open
            if (deleteConfirm.path === activeNotebookPath) {
                dispatch(closeNotebook(deleteConfirm.path));
            }

            // Delete from database
            await deleteNotebook(deleteConfirm.path);

            // Refresh the tree
            await loadNotebooks();

            // Close the confirmation dialog
            setDeleteConfirm(null);
        } catch (error) {
            console.error("Failed to delete notebook:", error);
            // You might want to show an error message here
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
            <div className="h-full bg-gray-50 border-r border-gray-200 flex flex-col">
                <div className="p-2 border-b border-gray-200 flex gap-1">
                    <button
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                        onClick={() => handleCreateNotebook()}
                        title="New Notebook"
                    >
                        <Plus size={14} />
                        Notebook
                    </button>
                    <button
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
                        onClick={() => handleCreateFolder()}
                        title="New Folder"
                    >
                        <Plus size={14} />
                        Folder
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {tree.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                            No notebooks yet. Create one to get started!
                        </div>
                    ) : (
                        tree.map((node) => (
                            <SidebarTreeNode
                                key={node.path}
                                node={node}
                                level={0}
                                isExpanded={expandedFolders.has(node.path)}
                                isActive={
                                    node.type === "notebook" &&
                                    node.path === activeNotebookPath
                                }
                                expandedFolders={expandedFolders}
                                activeNotebookPath={activeNotebookPath}
                                onToggleFolder={toggleFolder}
                                onDoubleClick={handleDoubleClick}
                                onCreateNotebook={handleCreateNotebook}
                                onCreateFolder={handleCreateFolder}
                                onMenuClick={handleMenuClick}
                            />
                        ))
                    )}
                </div>
            </div>
            <CreateNotebookDialog
                isOpen={showCreateNotebook}
                onClose={() => setShowCreateNotebook(false)}
                onSuccess={handleCreateSuccess}
                parentPath={createParentPath}
            />
            <CreateFolderDialog
                isOpen={showCreateFolder}
                onClose={() => setShowCreateFolder(false)}
                onSuccess={handleCreateSuccess}
                parentPath={createParentPath}
            />
            {menuAnchor && (
                <Menu
                    items={menuAnchor.items}
                    anchorRef={menuAnchor.ref}
                    onClose={() => setMenuAnchor(null)}
                />
            )}
            {deleteConfirm && (
                <Dialog
                    isOpen={deleteConfirm.isOpen}
                    onClose={() => !isDeleting && setDeleteConfirm(null)}
                    title="Delete Notebook"
                    maxWidth="md"
                >
                    <div className="p-4">
                        <div className="flex gap-3 mb-6">
                            <div className="shrink-0">
                                <AlertTriangle
                                    size={24}
                                    className="text-red-600"
                                />
                            </div>
                            <p className="text-sm text-gray-700">
                                Are you sure you want to delete "
                                {deleteConfirm.name}"? This action cannot be
                                undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </>
    );
}
