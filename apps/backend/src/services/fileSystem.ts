import fs from "fs/promises";
import path from "path";

// Proje bazlı çalışma dizini
const WORKSPACE_ROOT = path.join(process.cwd(), "workspaces");

export interface FileOperation {
  path: string;
  content: string;
  operation: "create" | "update" | "delete";
}

export interface FileChange {
  filePath: string;
  originalContent?: string;
  newContent: string;
  changeType: "create" | "update" | "delete";
}

export class FileSystemService {
  private projectPath: string;

  constructor(projectId: string) {
    this.projectPath = path.join(WORKSPACE_ROOT, projectId);
  }

  // Proje dizinini oluştur
  async initWorkspace(): Promise<void> {
    try {
      await fs.mkdir(this.projectPath, { recursive: true });
      console.log(`[FS] Workspace oluşturuldu: ${this.projectPath}`);
    } catch (err) {
      console.error(`[FS] Workspace oluşturulamadı: ${err}`);
    }
  }

  // Dosya oku
  async readFile(filePath: string): Promise<string | null> {
    const fullPath = path.join(this.projectPath, filePath);
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      return content;
    } catch (err) {
      return null;
    }
  }

  // Dosya yaz/oluştur
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.projectPath, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    console.log(`[FS] Dosya yazıldı: ${filePath}`);
  }

  // Dosya sil
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.projectPath, filePath);
    try {
      await fs.unlink(fullPath);
      console.log(`[FS] Dosya silindi: ${filePath}`);
    } catch (err) {
      console.error(`[FS] Dosya silinemedi: ${filePath}`);
    }
  }

  // Dizin yapısını oku
  async getDirectoryStructure(relativePath: string = ""): Promise<any> {
    const fullPath = path.join(this.projectPath, relativePath);
    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const structure: any[] = [];

      for (const item of items) {
        const itemPath = path.join(relativePath, item.name);
        if (item.isDirectory()) {
          structure.push({
            name: item.name,
            type: "directory",
            path: itemPath,
            children: await this.getDirectoryStructure(itemPath),
          });
        } else {
          const stats = await fs.stat(path.join(fullPath, item.name));
          structure.push({
            name: item.name,
            type: "file",
            path: itemPath,
            size: stats.size,
            modified: stats.mtime,
          });
        }
      }
      return structure;
    } catch (err) {
      return [];
    }
  }

  // Birden fazla dosya işlemini tek seferde uygula
  async applyChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      if (change.changeType === "delete") {
        await this.deleteFile(change.filePath);
      } else {
        await this.writeFile(change.filePath, change.newContent);
      }
    }
  }
}