import {
  Download,
  Eye,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DeployedCertificate } from '../../../types/deployed-certificate'

interface DeployedCertificateActionsProps {
  deployment: DeployedCertificate
  onAction: (action: string, deployment: DeployedCertificate) => void
}

/** Secondary actions live behind one menu so the card footer stays two buttons wide. */
export function DeployedCertificateActions({
  deployment,
  onAction,
}: DeployedCertificateActionsProps) {
  const running = deployment.status === 'distributing'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`More actions for ${deployment.event.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onAction('preview', deployment)}>
          <Eye className="h-3.5 w-3.5" />
          Preview certificate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('download', deployment)}>
          <Download className="h-3.5 w-3.5" />
          Download all sheets
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('export', deployment)}>
          <Table2 className="h-3.5 w-3.5" />
          Export recipient list
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {running ? (
          <DropdownMenuItem onSelect={() => onAction('pause', deployment)}>
            <PauseCircle className="h-3.5 w-3.5" />
            Pause distribution
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={deployment.status === 'completed'}
            onSelect={() => onAction('resume', deployment)}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Resume distribution
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
