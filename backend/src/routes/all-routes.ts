import { createCrudRoutes } from './crud-factory.js';
import { allRouteConfigs } from './route-table.js';

export { allRouteConfigs } from './route-table.js';

export function registerAllCrudRoutes(app: any) {
  for (const { prefix, config } of allRouteConfigs) {
    app.register(createCrudRoutes(config), { prefix });
  }
}
