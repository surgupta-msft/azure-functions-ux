import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Dropdown as OfficeDropdown, IDropdownProps, IDropdownOption, Stack } from '@fluentui/react';
import { dropdownStyleOverrides } from '../../../components/form-controls/formControl.override.styles';
import { ThemeContext } from '../../../ThemeContext';
import { useWindowSize } from 'react-use';
import { ResourceGroupInfo } from './CreateOrSelectResourceGroup';
import { CreatePlan } from './CreatePlan';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { ArmObj } from '../../../models/arm-obj';
import { ServerFarm } from '../../../models/serverFarm/serverfarm';
import { HostingEnvironment } from '../../../models/hostingEnvironment/hosting-environment';
import { ChangeAppPlanDefaultSkuCodes, ChangeAppPlanTierTypes } from './ChangeAppPlan.types';

export const NEW_PLAN = '__NEWPLAN__';

interface NewPlan {
  name: string;
  skuCode: string;
  tier: string;
}

export type NewPlanInfo = NewPlan & ResourceGroupInfo;

export interface CreateOrSelectPlanFormValues {
  isNewPlan: boolean;
  newPlanInfo: NewPlanInfo;
  existingPlan: ArmObj<ServerFarm> | null;
}

export interface CreateOrSelectPlanProps {
  subscriptionId: string;
  resourceGroupOptions: IDropdownOption[];
  serverFarmsInWebspace: ArmObj<ServerFarm>[];
  hostingEnvironment?: ArmObj<HostingEnvironment>;
  onPlanChange: (planInfo: CreateOrSelectPlanFormValues) => void;
  isUpdating: boolean;
  skuTier?: string;
}

export const CreateOrSelectPlan = (props: CreateOrSelectPlanFormValues & CreateOrSelectPlanProps & IDropdownProps) => {
  const {
    options,
    subscriptionId,
    hostingEnvironment,
    resourceGroupOptions,
    isNewPlan,
    newPlanInfo,
    existingPlan,
    onPlanChange,
    serverFarmsInWebspace,
    skuTier,
    isUpdating,
  } = props;

  const theme = useContext(ThemeContext);
  const { width } = useWindowSize();
  const { t } = useTranslation();

  const [planInfo, setPlanInfo] = useState<CreateOrSelectPlanFormValues>({
    isNewPlan,
    newPlanInfo,
    existingPlan,
  });

  const onChangeDropdown = useCallback(
    (_e: unknown, option: IDropdownOption) => {
      const info = { ...planInfo };

      if (option.data === NEW_PLAN) {
        info.isNewPlan = true;
        info.newPlanInfo.name = option.key as string;
        if (info.newPlanInfo.tier !== skuTier) {
          if (skuTier === ChangeAppPlanTierTypes.Dynamic) {
            info.newPlanInfo.tier = ChangeAppPlanTierTypes.Dynamic;
            info.newPlanInfo.skuCode = ChangeAppPlanDefaultSkuCodes.Dynamic;
          } else if (skuTier === ChangeAppPlanTierTypes.ElasticPremium) {
            info.newPlanInfo.tier = ChangeAppPlanTierTypes.ElasticPremium;
            info.newPlanInfo.skuCode = ChangeAppPlanDefaultSkuCodes.ElasticPremium;
          }
        }
      } else {
        info.isNewPlan = false;
        info.existingPlan = option.data;
      }

      setPlanInfo(info);
      onPlanChange(info);
    },
    [options]
  );

  const fullpage = width > 1000;

  useEffect(() => {
    if (options?.[0]) {
      onChangeDropdown(null, options[0]);
    }
  }, [options]);

  return (
    <>
      <Stack>
        <OfficeDropdown
          selectedKey={planInfo.isNewPlan ? planInfo.newPlanInfo.name : (planInfo.existingPlan as ArmObj<ServerFarm>).id.toLowerCase()}
          options={options}
          onChange={onChangeDropdown}
          styles={dropdownStyleOverrides(theme, fullpage)}
          ariaLabel={t('appServicePlan')}
          disabled={isUpdating}
        />
        <CreatePlan
          newPlanInfo={planInfo.newPlanInfo}
          serverFarmsInWebspace={serverFarmsInWebspace}
          resourceGroupOptions={resourceGroupOptions}
          subscriptionId={subscriptionId}
          hostingEnvironment={hostingEnvironment}
          onCreatePanelClose={newPlan => onCreatePanelClose(planInfo, setPlanInfo, newPlan, options, t, onPlanChange)}
          isUpdating={isUpdating}
        />
      </Stack>
    </>
  );
};

export const addNewPlanToOptions = (planName: string, options: IDropdownOption[], t: i18next.TFunction) => {
  if (planName) {
    const newItem = {
      key: planName,
      text: t('newFormat').format(planName),
      data: NEW_PLAN,
    };

    if (options.length > 0 && options[0].data === NEW_PLAN) {
      options[0] = newItem;
    } else {
      options.unshift(newItem);
    }
  }
};

const onCreatePanelClose = (
  planInfo: CreateOrSelectPlanFormValues,
  setPlanInfo: React.Dispatch<React.SetStateAction<CreateOrSelectPlanFormValues>>,
  newPlanInfo: NewPlanInfo,
  planOptions: IDropdownOption[],
  t: i18next.TFunction,
  onPlanChange: (planInfo: CreateOrSelectPlanFormValues) => void
) => {
  const info = {
    ...planInfo,
    newPlanInfo: {
      ...newPlanInfo,
    },
    isNewPlan: true,
  };

  addNewPlanToOptions(info.newPlanInfo.name, planOptions, t);
  setPlanInfo(info);
  onPlanChange(info);
};
