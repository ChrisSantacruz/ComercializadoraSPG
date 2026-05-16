import { ReportHandler } from 'web-vitals';
import { log } from './lib/observability/logger';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  const handler: ReportHandler =
    onPerfEntry ??
    ((metric) => {
      if (process.env.NODE_ENV === 'development') {
        log.debug(`vitals.${metric.name}`, { value: metric.value, id: metric.id });
      }
    });

  if (handler && handler instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(handler);
      getFID(handler);
      getFCP(handler);
      getLCP(handler);
      getTTFB(handler);
    });
  }
};

export default reportWebVitals;
