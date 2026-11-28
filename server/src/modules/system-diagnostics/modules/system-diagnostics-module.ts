import { Module } from '@nestjs/common';
import { SystemDiagnosticsSiteModule } from './system-diagnostics-site-module';

@Module({
  imports: [SystemDiagnosticsSiteModule],
})
export class SystemDiagnosticsModule {}
