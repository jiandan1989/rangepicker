import * as React from 'react';
import type { NullableDateType, RangeValue } from './interface';

export type RangeContextProps = {
  /**
   * Set displayed range value style.
   * Panel only has one value, this is only style effect.
   */
  rangedValue?: [NullableDateType<any>, NullableDateType<any>] | null;
  /** RangePicker 时 用于判断是否在选择日期范围内 */
  hoverRangedValue?: RangeValue<any>;
  /** 是否为 日期范围 */
  inRange?: boolean;
  panelPosition?: 'left' | 'right' | false;
};

const RangeContext = React.createContext<RangeContextProps>({});

export default RangeContext;
