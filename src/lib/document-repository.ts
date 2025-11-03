import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export { isSupabaseConfigured };

export const DOCUMENT_STORAGE_BUCKET = "document-files";

export type DocumentEntityType =
  | "profile"
  | "tax_account"
  | "transaction"
  | "exchange"
  | "eat"
  | "property";

export interface DocumentFile {
  id: string;
  folder_id: string;
  name: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFolder {
  id: string;
  repository_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFolderNode extends DocumentFolder {
  files: DocumentFile[];
  children: DocumentFolderNode[];
}

export interface DocumentRepositoryTree {
  repositoryId: string;
  rootFolders: DocumentFolderNode[];
}

const ensureSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Please set the environment variables before using the document repository."
    );
  }

  return getSupabaseClient();
};

export const ensureDocumentRepository = async (
  entityType: DocumentEntityType,
  entityId: string
): Promise<string> => {
  const supabase = ensureSupabaseClient();

  const { data: existingRepository, error: selectError } = await supabase
    .from("document_repositories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingRepository) {
    return existingRepository.id;
  }

  const { data: insertedRepository, error: insertRepositoryError } = await supabase
    .from("document_repositories")
    .insert({ entity_type: entityType, entity_id: entityId })
    .select("id")
    .single();

  if (insertRepositoryError || !insertedRepository) {
    throw insertRepositoryError ?? new Error("Failed to create repository");
  }

  // Create folders based on entity type
  if (entityType === "transaction") {
    // For transactions create four special folders
    const transactionFolders = [
      "Settlement Statement documents",
      "Wire Approvals",
      "Exchange Documents",
      "Contract Documents",
    ];

    const { error: foldersError } = await supabase.from("document_folders").insert(
      transactionFolders.map((folderName) => ({
        repository_id: insertedRepository.id,
        parent_id: null,
        name: folderName,
      }))
    );

    if (foldersError) {
      throw foldersError;
    }
  } else {
    // For other types create standard "Documents" folder
    const { error: rootFolderError } = await supabase.from("document_folders").insert({
      repository_id: insertedRepository.id,
      parent_id: null,
      name: "Documents",
    });

    if (rootFolderError) {
      throw rootFolderError;
    }
  }

  return insertedRepository.id;
};

export const fetchDocumentRepository = async (
  entityType: DocumentEntityType,
  entityId: string
): Promise<DocumentRepositoryTree> => {
  const supabase = ensureSupabaseClient();

  const repositoryId = await ensureDocumentRepository(entityType, entityId);

  const { data: folders, error: foldersError } = await supabase
    .from("document_folders")
    .select("*")
    .eq("repository_id", repositoryId)
    .order("created_at", { ascending: true });

  if (foldersError) {
    throw foldersError;
  }

  const folderIds = (folders ?? []).map((folder) => folder.id);

  const { data: files, error: filesError } = folderIds.length
    ? await supabase
        .from("document_files")
        .select("*")
        .in("folder_id", folderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (filesError) {
    throw filesError;
  }

  const folderMap = new Map<string, DocumentFolderNode>();
  (folders ?? []).forEach((folder) => {
    folderMap.set(folder.id, { ...folder, files: [], children: [] });
  });

  (files ?? []).forEach((file) => {
    const parentFolder = folderMap.get(file.folder_id);
    if (parentFolder) {
      parentFolder.files.push(file);
    }
  });

  const rootFolders: DocumentFolderNode[] = [];

  folderMap.forEach((folder) => {
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children.push(folder);
      }
    } else {
      rootFolders.push(folder);
    }
  });

  return { repositoryId, rootFolders };
};

export const createFolder = async (
  repositoryId: string,
  parentId: string | null,
  name: string
) => {
  const supabase = ensureSupabaseClient();
  const { error } = await supabase.from("document_folders").insert({
    repository_id: repositoryId,
    parent_id: parentId,
    name,
  });

  if (error) {
    throw error;
  }
};

export const renameFolder = async (folderId: string, name: string) => {
  const supabase = ensureSupabaseClient();
  const { error } = await supabase
    .from("document_folders")
    .update({ name })
    .eq("id", folderId);

  if (error) {
    throw error;
  }
};

export const deleteFolder = async (folderId: string) => {
  const supabase = ensureSupabaseClient();
  const { error } = await supabase.from("document_folders").delete().eq("id", folderId);

  if (error) {
    throw error;
  }
};

export const uploadFileToFolder = async (
  repositoryId: string,
  folderId: string,
  file: File
) => {
  const supabase = ensureSupabaseClient();

  const path = `${repositoryId}/${folderId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: insertError } = await supabase.from("document_files").insert({
    folder_id: folderId,
    name: file.name,
    storage_path: path,
  });

  if (insertError) {
    throw insertError;
  }
};

export const renameFile = async (fileId: string, name: string) => {
  const supabase = ensureSupabaseClient();
  const { error } = await supabase
    .from("document_files")
    .update({ name })
    .eq("id", fileId);

  if (error) {
    throw error;
  }
};

export const deleteFile = async (fileId: string, storagePath: string) => {
  const supabase = ensureSupabaseClient();

  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    throw storageError;
  }

  const { error: deleteError } = await supabase
    .from("document_files")
    .delete()
    .eq("id", fileId);

  if (deleteError) {
    throw deleteError;
  }
};
