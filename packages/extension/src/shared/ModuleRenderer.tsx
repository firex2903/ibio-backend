import type { CompanionModuleDTO, Referrer } from '@creator-bio-hub/types';
import type { TwitchAuth } from '../hooks/useTwitchAuth';
import { ChannelLinkModule }    from './modules/ChannelLinkModule';
import { CommunitySpaceModule } from './modules/CommunitySpaceModule';
import { StreamScheduleModule } from './modules/StreamScheduleModule';
import { PartnerCardModule }    from './modules/PartnerCardModule';
import { ViewerPerkModule }     from './modules/ViewerPerkModule';
import { SupportOptionModule }  from './modules/SupportOptionModule';
import { MerchShowcaseModule }  from './modules/MerchShowcaseModule';
import { ChannelEventModule }   from './modules/ChannelEventModule';
import { QuickActionModule }    from './modules/QuickActionModule';

interface Props {
  module: CompanionModuleDTO;
  profileId: string;
  auth: TwitchAuth | null;
  referrer: Referrer;
}

/**
 * Single dispatch point for all module kinds.
 * TypeScript ensures exhaustiveness via the default branch.
 */
export function ModuleRenderer({ module, profileId, auth, referrer }: Props) {
  const props = { module, profileId, auth, referrer };

  switch (module.moduleKind) {
    case 'CHANNEL_LINK':    return <ChannelLinkModule    {...props} />;
    case 'COMMUNITY_SPACE': return <CommunitySpaceModule {...props} />;
    case 'STREAM_SCHEDULE': return <StreamScheduleModule {...props} />;
    case 'PARTNER_CARD':    return <PartnerCardModule     {...props} />;
    case 'VIEWER_PERK':     return <ViewerPerkModule      {...props} />;
    case 'SUPPORT_OPTION':  return <SupportOptionModule   {...props} />;
    case 'MERCH_SHOWCASE':  return <MerchShowcaseModule   {...props} />;
    case 'CHANNEL_EVENT':   return <ChannelEventModule    {...props} />;
    case 'QUICK_ACTION':    return <QuickActionModule     {...props} />;
    default: {
      const _kind: never = module.moduleKind as never; // compile-time exhaustiveness
      console.warn('Unknown moduleKind:', _kind);
      return null;
    }
  }
}
