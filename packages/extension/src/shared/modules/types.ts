import type { CompanionModuleDTO, Referrer } from '@creator-bio-hub/types';
import type { TwitchAuth } from '../../hooks/useTwitchAuth';

/** Common props every module component receives */
export interface ModuleProps {
  module: CompanionModuleDTO;
  profileId: string;
  auth: TwitchAuth | null;
  referrer: Referrer;
}
