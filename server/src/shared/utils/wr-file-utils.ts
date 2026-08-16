import fs from 'fs';
import path from 'path';

export class FileUtils {
  static resolveTemplatePath(fileName: string): string {
    const candidates = [
      path.join(__dirname, '..', 'templates', fileName),
      path.join(process.cwd(), 'src', 'shared', 'templates', fileName),
      path.join(process.cwd(), 'dist', 'src', 'shared', 'templates', fileName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(`Email template not found: ${fileName}`);
  }

  static readFile(filePath: string): string {
    const resolvedPath = filePath.includes(path.sep)
      ? filePath
      : this.resolveTemplatePath(filePath);
    return fs.readFileSync(resolvedPath, 'utf8');
  }
}
