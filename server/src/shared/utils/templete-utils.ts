import { FileUtils } from './wr-file-utils';
import handlebars from 'handlebars';

export class TemplateUtils {
  static async compileTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<string> {
    const template = FileUtils.readFile(templateName);
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }
}
