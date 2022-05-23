import { Moment } from 'moment';
import momentGenerateConfig from 'rc-picker/lib/generate/moment';
import zhCN from 'rc-picker/lib/locale/zh_CN';
import React from 'react';
import { RangePickerPanel } from '../../index';

export default () => {
  return (
    <RangePickerPanel<Moment>
      locale={zhCN}
      showTime={false}
      mode={['date', 'date']}
      // ranges={{ today: moment() }}
      generateConfig={momentGenerateConfig}
      renderExtraFooter={() => <span>renderExtraFooter</span>}
    />
  );
};
