import moment from 'moment';
import momentGenerateConfig from 'rc-picker/lib/generate/moment';
import zhCN from 'rc-picker/lib/locale/zh_CN';
import React from 'react';
import RangePickerPanel from '../../src/RangePickerPanel';
import './index.less';

export default () => {
  return (
    <RangePickerPanel
      locale={zhCN}
      generateConfig={momentGenerateConfig}
      ranges={{
        'THIS MONTH': [moment(), moment().add(1, 'M')],
        'THIS YEAR': [moment().startOf('year'), moment().endOf('year')],
      }}
    />
  );
};
