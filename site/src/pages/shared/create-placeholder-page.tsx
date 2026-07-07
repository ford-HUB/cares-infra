/** Factory for thin route pages — keeps route file readable while migration continues. */
import { PlaceholderPage } from '../../components/portal/ui/placeholder-page'

export function createPlaceholderPage(title: string, description?: string) {
  return function PlaceholderRoutePage() {
    return <PlaceholderPage title={title} description={description} />
  }
}
