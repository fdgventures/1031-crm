"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DocumentEntityType,
  DocumentFolderNode,
  DocumentRepositoryTree,
  DOCUMENT_STORAGE_BUCKET,
  createFolder,
  deleteFile,
  deleteFolder,
  ensureDocumentRepository,
  fetchDocumentRepository,
  isSupabaseConfigured,
  renameFile,
  renameFolder,
  uploadFileToFolder,
} from "@/lib/document-repository";
import { Button } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

interface DocumentRepositoryProps {
  entityType: DocumentEntityType;
  entityId: string;
}

type State = {
  loading: boolean;
  error: string | null;
  tree: DocumentRepositoryTree | null;
};

const initialState: State = {
  loading: true,
  error: null,
  tree: null,
};

function sortTree(node: DocumentFolderNode) {
  node.children.sort((a, b) => a.name.localeCompare(b.name));
  node.files.sort((a, b) => a.name.localeCompare(b.name));
  node.children.forEach(sortTree);
}

export default function DocumentRepository({ entityType, entityId }: DocumentRepositoryProps) {
  const [state, setState] = useState<State>(initialState);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentUploadFolder, setCurrentUploadFolder] = useState<string | null>(null);
  const supabaseClient = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );
  const supabaseReady = Boolean(supabaseClient);

  const loadTree = React.useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const tree = await fetchDocumentRepository(entityType, entityId);
      tree.rootFolders.forEach(sortTree);
      setState({ loading: false, error: null, tree });
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to load document repository",
        tree: null,
      });
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (!supabaseReady) {
      setState({ loading: false, error: null, tree: null });
      return;
    }

    void loadTree();
  }, [supabaseReady, entityType, entityId, loadTree]);

  const handleCreateFolder = async (parentId: string | null) => {
    const name = window.prompt("Folder name", "New Folder");
    if (!name) return;

    try {
      setIsCreatingFolder(true);
      const repositoryId = state.tree
        ? state.tree.repositoryId
        : await ensureDocumentRepository(entityType, entityId);
      await createFolder(repositoryId, parentId, name.trim());
      await loadTree();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to create folder"
      );
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const name = window.prompt("Rename folder", currentName);
    if (!name || name === currentName) return;

    try {
      await renameFolder(folderId, name.trim());
      await loadTree();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to rename folder"
      );
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Delete this folder and all its contents?")) return;

    try {
      await deleteFolder(folderId);
      await loadTree();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete folder"
      );
    }
  };

  const handleUploadFile = async (folderId: string, file: File) => {
    try {
      if (!state.tree) {
        await ensureDocumentRepository(entityType, entityId);
      }
      await uploadFileToFolder(state.tree!.repositoryId, folderId, file);
      await loadTree();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to upload file"
      );
    }
  };

  const handleRenameFile = async (fileId: string, currentName: string) => {
    const name = window.prompt("Rename file", currentName);
    if (!name || name === currentName) return;

    try {
      await renameFile(fileId, name.trim());
      await loadTree();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to rename file"
      );
    }
  };

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    if (!window.confirm("Delete this file?")) return;

    try {
      await deleteFile(fileId, storagePath);
      await loadTree();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete file"
      );
    }
  };

  const handleDownloadFile = async (storagePath: string, name: string) => {
    try {
      if (!supabaseClient) return;
      const { data, error } = await supabaseClient.storage
        .from(DOCUMENT_STORAGE_BUCKET)
        .download(storagePath);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to download file"
      );
    }
  };

  const triggerUpload = (folderId: string) => {
    setCurrentUploadFolder(folderId);
    fileInputRef.current?.click();
  };

  const onFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUploadFolder) return;
    await handleUploadFile(currentUploadFolder, file);
    event.target.value = "";
    setCurrentUploadFolder(null);
  };

  if (!supabaseReady) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
        Document repository is unavailable because Supabase environment variables
        are not configured.
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading documents...
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {state.error}
      </div>
    );
  }

  if (!state.tree) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Document Repository</h2>
          <p className="text-sm text-gray-500">
            Organize folders and upload supporting documents for this record.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={isCreatingFolder}
            onClick={() => handleCreateFolder(null)}
          >
            + New Folder
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerUpload(state.tree!.rootFolders[0]?.id)}
            disabled={!state.tree.rootFolders.length}
          >
            + Upload File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileInputChange}
          />
        </div>
      </div>

      <div className="px-6 py-4">
        {state.tree.rootFolders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Repository is empty. Create a folder or upload a file to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {state.tree.rootFolders.map((folder) => (
              <FolderNode
                key={folder.id}
                node={folder}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onUploadFile={triggerUpload}
                onRenameFile={handleRenameFile}
                onDeleteFile={handleDeleteFile}
                onDownloadFile={handleDownloadFile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type FolderNodeProps = {
  node: DocumentFolderNode;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onUploadFile: (folderId: string) => void;
  onRenameFile: (fileId: string, currentName: string) => void;
  onDeleteFile: (fileId: string, storagePath: string) => void;
  onDownloadFile: (storagePath: string, name: string) => void;
};

function FolderNode({
  node,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUploadFile,
  onRenameFile,
  onDeleteFile,
  onDownloadFile,
}: FolderNodeProps) {
  const hasChildren = node.children.length > 0;
  const hasFiles = node.files.length > 0;

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
        <div className="font-medium text-gray-900">{node.name}</div>
        <div className="flex gap-2 text-xs">
          <button
            className="text-blue-600 hover:text-blue-800"
            onClick={() => onCreateFolder(node.id)}
          >
            + Folder
          </button>
          <button
            className="text-blue-600 hover:text-blue-800"
            onClick={() => onUploadFile(node.id)}
          >
            + File
          </button>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => onRenameFolder(node.id, node.name)}
          >
            Rename
          </button>
          {node.parent_id !== null && (
            <button
              className="text-red-600 hover:text-red-800"
              onClick={() => onDeleteFolder(node.id)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        {hasFiles && (
          <ul className="space-y-2">
            {node.files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between rounded border border-gray-100 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    Uploaded {new Date(file.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => onDownloadFile(file.storage_path, file.name)}
                  >
                    Download
                  </button>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => onRenameFile(file.id, file.name)}
                  >
                    Rename
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => onDeleteFile(file.id, file.storage_path)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasChildren && (
          <div className="space-y-2">
            {node.children.map((child) => (
              <FolderNode
                key={child.id}
                node={child}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onUploadFile={onUploadFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                onDownloadFile={onDownloadFile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
