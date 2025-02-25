import { StackProps } from '../../WindowsStacks/WindowsStacks';
import DropdownNoFormik from '../../../../../../components/form-controls/DropDownnoFormik';
import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { FunctionAppStacksContext, PermissionsContext } from '../../../Contexts';
import { FunctionAppStack } from '../../../../../../models/stacks/function-app-stacks';
import { CommonConstants, WorkerRuntimeLanguages } from '../../../../../../utils/CommonConstants';
import { addOrUpdateFormAppSetting, findFormAppSettingValue, findFormAppSettingIndex } from '../../../AppSettingsFormData';
import { FunctionsRuntimeVersionHelper } from '../../../../../../utils/FunctionsRuntimeVersionHelper';
import { SiteStateContext } from '../../../../../../SiteState';
import { Field } from 'formik';
import { isContainerApp } from '../../../../../../utils/arm-utils';
import { getStackVersionDropdownOptions } from './FunctionAppStackSettings.data';
import { AppStackOs } from '../../../../../../models/stacks/app-stacks';
import { settingsWrapper } from '../../../AppSettingsForm';
import { Links } from '../../../../../../utils/FwLinks';
import TextField from '../../../../../../components/form-controls/TextField';
import { IDropdownOption } from '@fluentui/react';
import { AppSettingsFormValues, FormAppSetting } from '../../../AppSettings.types';
import Dropdown from '../../../../../../components/form-controls/DropDown';
import {
  filterFunctionAppStack,
  getFunctionAppStackObject,
  getFunctionAppStackVersion,
  getStackVersionConfigPropertyName,
  isWindowsNodeApp,
} from '../../../../../../utils/stacks-utils';

const FunctionAppStackSettings: React.FC<StackProps> = props => {
  const { t } = useTranslation();
  const { initialValues, values } = props;
  const siteStateContext = useContext(SiteStateContext);
  const { app_write, editable, saving } = useContext(PermissionsContext);

  const disableAllControls = !app_write || !editable || saving;
  const runtimeVersion =
    findFormAppSettingValue(initialValues.appSettings, CommonConstants.AppSettingNames.functionsExtensionVersion) || '';
  const runtimeMajorVersion = FunctionsRuntimeVersionHelper.getFunctionsRuntimeMajorVersionWithV4(runtimeVersion);
  const isLinux = () => siteStateContext.isLinuxApp;

  const [runtimeStack, setRuntimeStack] = useState<string | undefined>(undefined);
  const [currentStackData, setCurrentStackData] = useState<FunctionAppStack | undefined>(undefined);
  const [initialStackVersion, setInitialStackVersion] = useState<string | undefined>(undefined);
  const [selectedStackVersion, setSelectedStackVersion] = useState<string | undefined>(undefined);
  const [dirtyState, setDirtyState] = useState(false);

  const getInitialStack = () => {
    return initialValues.currentlySelectedStack;
  };

  const getStackVersion = (values: AppSettingsFormValues, stack?: string) => {
    return getFunctionAppStackVersion(values, isLinux(), stack);
  };

  const getConfigProperty = (runtimeStack?: string) => {
    return getStackVersionConfigPropertyName(isLinux(), runtimeStack);
  };

  const filterStacks = (supportedStacks: FunctionAppStack[]) => {
    const initialStack = getInitialStack();
    return filterFunctionAppStack(supportedStacks, initialValues, isLinux(), initialStack);
  };

  const functionAppStacksContext = filterStacks(useContext(FunctionAppStacksContext));

  const setInitialData = () => {
    const runtimeStack = getInitialStack();
    if (runtimeStack && functionAppStacksContext.length > 0) {
      setRuntimeStack(runtimeStack);
      setInitialStackData(runtimeStack);
    }
    const initialStackVersion = getStackVersion(initialValues, runtimeStack);
    setInitialStackVersion(initialStackVersion);
    setSelectedStackVersion(initialStackVersion);
    setDirtyState(false);
  };

  const setStackVersion = (values: AppSettingsFormValues) => {
    const version = getStackVersion(values, runtimeStack);
    setSelectedStackVersion(version);
    setDirtyState(isVersionDirty());
  };

  const setInitialStackData = (runtimeStack: string) => {
    setCurrentStackData(getFunctionAppStackObject(functionAppStacksContext, isLinux(), runtimeStack));
  };

  const isVersionDirty = () => {
    // NOTE(krmitta): For Windows node app only we get the version from app-setting instead of config, thus this special case.
    if (isWindowsNodeApp(isLinux(), runtimeStack)) {
      if (!!initialStackVersion && !!values.appSettings) {
        const index = findFormAppSettingIndex([...values.appSettings], CommonConstants.AppSettingNames.websiteNodeDefaultVersion);
        if (index !== -1) {
          return values.appSettings[index].value !== initialStackVersion;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      const stackVersionProperty = getConfigProperty(runtimeStack);
      return !!values.config && values.config.properties[stackVersionProperty] !== initialStackVersion;
    }
  };

  const isWindowsContainer = () => !siteStateContext.site || (!isLinux() && isContainerApp(siteStateContext.site));

  const isMajorVersionVisible = () => {
    return runtimeStack !== WorkerRuntimeLanguages.custom;
  };

  const isDotNetApp = (runtimeStack: string) => {
    return runtimeStack === WorkerRuntimeLanguages.dotnet;
  };

  const isStackDropdownComponentVisible = () => {
    return (
      siteStateContext.site &&
      !isContainerApp(siteStateContext.site) &&
      runtimeStack &&
      (!isDotNetApp(runtimeStack) || isLinux()) &&
      currentStackData
    );
  };

  const onMajorVersionChange = (_, option: IDropdownOption) => {
    setSelectedStackVersion(option.key as string);
    // NOTE(krmitta): For Windows node app only we get the version from app-setting instead of config, thus this special case.
    if (isWindowsNodeApp(isLinux(), runtimeStack)) {
      const versionData = option.data;
      if (
        !!versionData &&
        !!versionData.stackSettings &&
        !!versionData.stackSettings.windowsRuntimeSettings &&
        !!versionData.stackSettings.windowsRuntimeSettings.appSettingsDictionary &&
        !!versionData.stackSettings.windowsRuntimeSettings.appSettingsDictionary[CommonConstants.AppSettingNames.websiteNodeDefaultVersion]
      ) {
        let appSettings: FormAppSetting[] = [...values.appSettings];
        appSettings = addOrUpdateFormAppSetting(
          values.appSettings,
          CommonConstants.AppSettingNames.websiteNodeDefaultVersion,
          versionData.stackSettings.windowsRuntimeSettings.appSettingsDictionary[CommonConstants.AppSettingNames.websiteNodeDefaultVersion]
        );
        props.setFieldValue('appSettings', appSettings);
      }
    } else {
      props.setFieldValue(`config.properties.${getConfigProperty(runtimeStack)}`, option.key);
    }
  };

  const getStackDropdownComponent = () => {
    return (
      siteStateContext.site &&
      !isContainerApp(siteStateContext.site) &&
      runtimeStack &&
      (!isDotNetApp(runtimeStack) || isLinux()) &&
      currentStackData && (
        <>
          <DropdownNoFormik
            id="function-app-stack"
            selectedKey={runtimeStack}
            disabled={true}
            onChange={() => {}}
            options={[{ key: runtimeStack, text: currentStackData.displayText }]}
            label={t('stack')}
          />
          {isMajorVersionVisible() && (
            <Field
              id="function-app-stack-major-version"
              selectedKey={selectedStackVersion}
              onChange={onMajorVersionChange}
              dirty={dirtyState}
              component={Dropdown}
              disabled={disableAllControls}
              label={t('versionLabel').format(currentStackData.displayText)}
              options={getStackVersionDropdownOptions(
                currentStackData,
                runtimeMajorVersion,
                isLinux() ? AppStackOs.linux : AppStackOs.windows
              )}
            />
          )}
        </>
      )
    );
  };

  const getStartupCommandComponent = () => {
    return (
      isLinux() &&
      !siteStateContext.isFunctionApp && (
        <Field
          id="linux-function-app-appCommandLine"
          name="config.properties.appCommandLine"
          component={TextField}
          dirty={values.config.properties.appCommandLine !== initialValues.config.properties.appCommandLine}
          disabled={disableAllControls}
          label={t('appCommandLineLabel')}
          infoBubbleMessage={t('appCommandLineLabelHelpNoLink')}
          learnMoreLink={Links.linuxContainersLearnMore}
          style={{ marginLeft: '1px', marginTop: '1px' }} // Not sure why but left border disappears without margin and for small windows the top also disappears
        />
      )
    );
  };

  useEffect(() => {
    setStackVersion(values);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, runtimeStack]);
  useEffect(() => {
    setInitialData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  if (isWindowsContainer()) {
    return null;
  }
  return isStackDropdownComponentVisible() ? (
    <>
      <h3>{t('stackSettings')}</h3>
      <div className={settingsWrapper}>
        {getStackDropdownComponent()}
        {getStartupCommandComponent()}
      </div>
    </>
  ) : null;
};

export default FunctionAppStackSettings;
