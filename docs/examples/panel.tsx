import momentGenerateConfig from 'rc-picker/lib/generate/moment';
import zhCN from 'rc-picker/lib/locale/zh_CN';
import React from 'react';
import RangePickerPanel from '../../src/RangePickerPanel';
import './index.less';

export default () => {
  return (
    <RangePickerPanel
      // picker="time"
      // direction="rtl"
      locale={zhCN}
      // defaultValue={[moment(), moment().add(1, 'M')]}
      generateConfig={momentGenerateConfig}
      panelRender={[(node) => <span>1</span>, (node) => node]}
    />
  );
};
