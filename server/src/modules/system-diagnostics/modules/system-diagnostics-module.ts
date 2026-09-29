import { Module } from '@nestjs/common';
import { SystemDiagnosticsSiteModule } from './system-diagnostics-site-module';

/** Site-only: the diagnostics board lives on the admin portal. */
@Module({
  imports: [SystemDiagnosticsSiteModule],
})
export class SystemDiagnosticsModule {}
