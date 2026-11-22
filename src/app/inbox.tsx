import { EmptyState } from '@/components/marketplace/empty-state';

export default function InboxScreen() {
  return <EmptyState screen="Inbox" icon="inbox" title="No conversations yet"
    description="Buyer and seller conversations will appear here when messaging opens." />;
}
