// Run with: node scripts/regression-check.cjs
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const rx = require('rxjs');

(async () => {
  await import('@angular/compiler');
  // forkJoin checks object prototypes; normalize dictionaries across the VM boundary.
  const modules = { rxjs: { ...rx, forkJoin: input => rx.forkJoin({ ...input }) } };
  for (const name of ['@angular/core', '@angular/common/http', '@angular/forms', '@angular/material/table', '@angular/router']) {
    modules[name] = await import(name);
  }
  const storage = new Map();
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  function load(file) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true }
    }).outputText;
    vm.runInNewContext(source, {
      exports, localStorage, crypto: require('crypto').webcrypto, window: { addEventListener() {} }, console,
      require: name => modules[name] || (name === 'src/environments/environment'
        ? { environment: { apiURL: 'https://api.example/' } }
        : name === '@app/shared/models/sale' ? { SaleStatus: { COMPLETED: 'COMPLETED', ORDERS: 'ORDERS' } } : name.startsWith('@app/') ? {} : require(name))
    });
    return exports;
  }
  const { AuthService } = load('services/auth.service.ts');
  modules['@app/services/auth.service'] = { AuthService };
  const response = new rx.Subject();
  let requests = 0;
  const auth = new AuthService({ put() { requests++; return response; } });
  localStorage.setItem('refreshToken', 'refresh-old');
  localStorage.setItem('username', 'tester');
  const first = rx.firstValueFrom(auth.refreshToken());
  const second = rx.firstValueFrom(auth.refreshToken());
  assert.equal(requests, 1, 'Concurrent refreshes must share one request');
  const token = 'e30.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature';
  response.next({ body: { accessToken: token, refreshToken: 'refresh-new', username: 'tester' } });
  response.complete();
  await Promise.all([first, second]);
  assert.equal(auth.getToken(), token);
  assert.equal(auth.isAuthenticated(), true);
  auth.logout();
  await assert.rejects(rx.firstValueFrom(auth.refreshToken()));
  localStorage.setItem('expiration', 'invalid');
  assert.equal(auth.isTokenExpired(), true);

  const { AuthGuard } = load('services/auth.guard.ts');
  let refreshes = 0;
  const guard = new AuthGuard({ isAuthenticated: () => refreshes > 0, getRefreshToken: () => 'r', refreshToken: () => { refreshes++; return rx.of({}); } }, { createUrlTree: () => 'login' });
  assert.equal(await rx.firstValueFrom(guard.canActivate()), true);
  assert.equal(guard.canActivateChild(), true);

  const { JwtInterceptor } = load('core/interceptors/jwt.interceptor.ts');
  let currentToken = 'old';
  let renewCount = 0;
  let redirected = false;
  const interceptorAuth = {
    getToken: () => currentToken,
    isTokenExpired: () => false,
    getRefreshToken: () => 'refresh',
    isAuthenticated: () => !!currentToken,
    logout: () => { currentToken = null; },
    refreshToken: () => { renewCount++; currentToken = 'new'; return rx.of({}); }
  };
  const interceptor = new JwtInterceptor({ get: key => key === AuthService ? interceptorAuth : { navigateByUrl: () => { redirected = true; } } });
  const { HttpRequest, HttpResponse, HttpErrorResponse } = modules['@angular/common/http'];
  const seen = [];
  await rx.firstValueFrom(interceptor.intercept(new HttpRequest('GET', 'https://api.example/api/products'), {
    handle: req => {
      seen.push(req.headers.get('Authorization'));
      return seen.length === 1 ? rx.throwError(() => new HttpErrorResponse({ status: 401 })) : rx.of(new HttpResponse({ status: 200 }));
    }
  }));
  assert.deepEqual(seen, ['Bearer old', 'Bearer new']);
  assert.equal(renewCount, 1);
  await rx.firstValueFrom(interceptor.intercept(new HttpRequest('GET', 'https://other.example/'), {
    handle: req => { assert.equal(req.headers.has('Authorization'), false); return rx.of(new HttpResponse()); }
  }));
  interceptorAuth.refreshToken = () => { currentToken = null; return rx.throwError(() => new Error('expired')); };
  await assert.rejects(rx.firstValueFrom(interceptor.intercept(new HttpRequest('GET', 'https://api.example/api/products'), {
    handle: () => rx.throwError(() => new HttpErrorResponse({ status: 401 }))
  })));
  assert.equal(redirected, true);

  const protectedRoute = { pathFromRoot: [{ data: {} }, { data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] } }] };
  let roles = ['ROLE_USER'];
  const roleGuard = new AuthGuard({ isAuthenticated: () => true, hasAnyRole: required => required.some(role => roles.includes(role)) }, { createUrlTree: () => 'denied' });
  assert.equal(roleGuard.canActivateChild(protectedRoute), 'denied');
  roles = ['ROLE_MANAGER'];
  assert.equal(roleGuard.canActivateChild(protectedRoute), true);
  roles = ['ROLE_ADMIN'];
  assert.equal(roleGuard.canActivateChild(protectedRoute), true);
  assert.equal(roleGuard.canActivateChild({ pathFromRoot: [{ data: { roles: ['ROLE_ADMIN'] } }] }), true);

  const pause = () => new Promise(resolve => setTimeout(resolve, 350));
  for (const [file, name] of [
    ['pages/sales/sale/sale.component.ts', 'SaleComponent'],
    ['pages/sales/sales-order/sales-order.component.ts', 'SalesOrderComponent']
  ]) {
    const Component = load(file)[name];
    const client = { id: 1, firstName: 'Ana' };
    const clientService = { findAll: (...args) => { assert.equal(args[2], 'firstName'); return rx.of({ _embedded: { clients: [client] } }); } };
    const saleResponses = [];
    const keys = [];
    const saleService = {
      create: (payload, key) => { keys.push(key); const response = new rx.Subject(); saleResponses.push(response); return response; },
      countSalesCurrentDay: () => rx.of(1), countOrdersCurrentDay: () => rx.of(1)
    };
    const component = new Component(new modules['@angular/forms'].FormBuilder(), {}, clientService, { success() {}, error() {} }, saleService, {});
    component.loadingClients();
    await pause();
    assert.equal(component.clients[0], client);
    component.form.get('clientId').setValue('Ana');
    await pause();
    assert.equal(component.filteredClients.length, 1);
    const item = { productId: 1, product: { id: 1, salePrice: 10 }, quantity: 2 };
    component.saleItems = [item];
    component.selectedClient = client;
    component.form.get('clientId').setValue(client);
    component.form.get('clientId').disable();
    component.editItem(item);
    assert.equal(component.selectedClient, client, 'Editing last item must preserve client');
    assert.equal(component.form.get('clientId').value, client);
    assert.equal(component.form.get('quantity').value, 2);
    assert.equal(component.saleItems.length, 0);
    clientService.findAll = (...args) => { assert.equal(args[4], 'Cliente remoto'); return rx.of({}); };
    component.form.get('clientId').enable();
    component.form.get('clientId').setValue('Cliente remoto');
    await pause();
    assert.equal(component.clients.length, 0, 'Empty HATEOAS response must be accepted');
    let cancelled = false;
    clientService.findAll = () => new rx.Observable(() => () => { cancelled = true; });
    component.form.get('clientId').setValue('antigo');
    await pause();
    clientService.findAll = () => rx.of({ _embedded: { clients: [client] } });
    component.form.get('clientId').setValue('novo');
    await pause();
    assert.equal(cancelled, true, 'Superseded search must be cancelled');
    assert.equal(component.clients[0], client);
    clientService.findAll = () => rx.throwError(() => new Error('offline'));
    component.form.get('clientId').setValue('erro');
    await pause();
    assert.equal(component.clientsError, true);
    assert.equal(component.clientsLoading, false);
    component.saleItems = [item];
    component.calculateTotal();
    component.processSale();
    component.processSale();
    assert.equal(keys.length, 1, 'Double click must send only one request');
    assert.equal(component.isSaving, true);
    saleResponses[0].error({ error: { message: 'timeout' } });
    assert.equal(component.isSaving, false);
    component.processSale();
    assert.equal(keys[1], keys[0], 'Retry must reuse the same operation key');
    saleResponses[1].next({});
    saleResponses[1].complete();
    component.saleItems = [item];
    component.selectedClient = client;
    component.calculateTotal();
    component.processSale();
    assert.notEqual(keys[2], keys[0], 'A new sale needs a new key');
    saleResponses[2].next({});
    saleResponses[2].complete();
    component.ngOnDestroy();
  }
  const Dashboard = load('pages/dashboard/dashboard-list/dashboard-list.component.ts').DashboardListComponent;
  const saleCounts = {};
  for (const name of ['countByCreatedDateBetweenAndSaleStatusAndStatus', 'countYesterdaySales', 'countSalesCurrentMonth', 'countSalesPreviousMonth', 'countByStatusAndSaleStatus']) saleCounts[name] = () => rx.of(0);
  saleCounts.getSalesWeek = () => rx.of([]);
  const summaryData = { salesToday: 0, salesYesterday: 0, salesMonth: 0, salesPreviousPeriod: 0, revenueToday: 0, revenueMonth: 0, lowStockProducts: 0 };
  const summaryApi = { summary: () => rx.of(summaryData) };
  const dashboard = new Dashboard(summaryApi, saleCounts, { countClients: () => rx.of(0) }, { countProducts: () => rx.of(0) }, { hasAnyRole: required => required.includes('ROLE_MANAGER') }, { getTopProducts: () => rx.of([]) });
  dashboard.loadTotalVendasHoje();
  assert.equal(dashboard.loadError, false);
  assert.equal(dashboard.totalVendasHoje, 0);
  saleCounts.getSalesWeek = () => rx.throwError(() => new Error('offline'));
  dashboard.loadTotalVendasHoje();
  assert.equal(dashboard.loadError, true, 'Failed dashboard is distinct from zero sales');
  assert.equal(dashboard.isLoading, false);
  assert.equal(dashboard.totalVendasHoje, 0, 'A failed chart must not hide available counters');
  assert.equal(dashboard.weekUnavailable, true);
  summaryApi.summary = () => rx.throwError(() => new Error('summary endpoint unavailable'));
  saleCounts.countByCreatedDateBetweenAndSaleStatusAndStatus = () => rx.of(7);
  dashboard.loadTotalVendasHoje();
  assert.equal(dashboard.summary, null, 'Unavailable revenue must not be represented as zero');
  assert.equal(dashboard.totalVendasHoje, 7, 'Legacy counters remain available without the new endpoint');
  assert.equal(dashboard.variationSale, null, 'Do not compare incompatible periods in fallback');
  saleCounts.countByCreatedDateBetweenAndSaleStatusAndStatus = () => rx.throwError(() => new Error('offline'));
  dashboard.loadTotalVendasHoje();
  assert.equal(dashboard.totalVendasHoje, null, 'Failed counts must not display zero or stale values');
  summaryApi.summary = () => rx.of(summaryData);
  saleCounts.getSalesWeek = () => rx.of([]);
  dashboard.loadTotalVendasHoje();
  assert.equal(dashboard.loadError, false, 'Retry clears the error after recovery');
  assert.equal(dashboard.weekUnavailable, false);
  assert.equal(dashboard.totalVendasHoje, 0);


  const dashboardRoute = { pathFromRoot: [{ data: {} }, { routeConfig: { path: 'dashboard' }, data: { roles: ['ROLE_MANAGER'] } }] };
  for (const role of ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MANAGER']) {
    const dashboardGuard = new AuthGuard({ isAuthenticated: () => true, hasAnyRole: required => required.includes(role) }, { createUrlTree: commands => commands[0] });
    assert.equal(dashboardGuard.canActivateChild(dashboardRoute), role === 'ROLE_MANAGER' ? true : role === 'ROLE_ADMIN' ? '/users/allUser' : '/sales/sale');
    const menu = load('shared/models/menu.ts').menuItems.find(item => item.link === '/dashboard');
    assert.equal(menu.roles.includes(role), role === 'ROLE_MANAGER');
  }

  const stockRoles = ['ROLE_MANAGER', 'ROLE_USER'];
  for (const role of stockRoles) {
    assert.ok(load('shared/models/menu.ts').menuForRoles([role]).some(item => item.link === '/stock'));
    const stockGuard = new AuthGuard({ isAuthenticated: () => true, hasAnyRole: required => required.includes(role) }, { createUrlTree: () => 'denied' });
    assert.equal(stockGuard.canActivateChild({ pathFromRoot: [{ data: { roles: stockRoles } }] }), true);
  }
  const adminRoles = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_USER'];
  const mixedGuard = new AuthGuard({ isAuthenticated: () => true, hasAnyRole: required => required.some(role => adminRoles.includes(role)) }, { createUrlTree: commands => commands[0] });
  for (const businessRoles of [['ROLE_MANAGER'], ['ROLE_MANAGER', 'ROLE_USER']]) {
    assert.equal(mixedGuard.canActivateChild({ pathFromRoot: [{ data: { roles: businessRoles } }] }), '/users/allUser');
  }
  const visibleAdminMenu = load('shared/models/menu.ts').menuForRoles(adminRoles);
  assert.deepEqual(Array.from(visibleAdminMenu, item => item.link), ['/users/allUser', '/support']);

  for (const role of ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_USER']) {
    const supportGuard = new AuthGuard({ isAuthenticated: () => true, hasAnyRole: required => required.includes(role) }, { createUrlTree: () => 'denied' });
    assert.equal(supportGuard.canActivateChild({ pathFromRoot: [{ data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_USER'] } }] }), true);
    assert.ok(load('shared/models/menu.ts').menuForRoles([role]).some(item => item.link === '/support'));
  }

  const AddUser = load('pages/users/add-user/add-user.component.ts').AddUserComponent;
  const addUser = new AddUser(new modules['@angular/forms'].FormBuilder(), {}, {}, {}, {});
  const username = addUser.form.get('userName');
  username.setValue('a'); assert.equal(username.valid, true);
  username.setValue('a'.repeat(21)); assert.equal(username.valid, false);
  username.setValue('   '); assert.equal(username.valid, false);
  const password = addUser.form.get('password');
  password.setValue('a'.repeat(11)); assert.equal(password.valid, false);
  password.setValue('a'.repeat(12)); assert.equal(password.valid, true);
  password.setValue('a'.repeat(129)); assert.equal(password.valid, false);
  password.setValue(' '.repeat(12)); assert.equal(password.valid, false);
  const Profile = load('pages/users/my-profile/my-profile.component.ts').MyProfileComponent;
  const profile = new Profile(new modules['@angular/forms'].FormBuilder(), {}, {}, {});
  profile.form.patchValue({ oldPassword: 'a'.repeat(12), newPassword: 'a'.repeat(12), confirmPassword: 'a'.repeat(12) });
  assert.equal(profile.form.hasError('samePassword'), true);
  profile.form.patchValue({ newPassword: 'b'.repeat(12), confirmPassword: 'b'.repeat(12) });
  assert.equal(profile.form.valid, true);

  const Login = load('pages/auth/login/login.component.ts').LoginComponent;
  let loginCalls = 0;
  let loginResponse = new rx.Subject();
  let target = '/sales/sale?client=1#details';
  let navigated = '';
  const login = new Login(new modules['@angular/forms'].FormBuilder(), {
    hasAnyRole: required => required.includes('ROLE_MANAGER'),
    login: payload => {
      loginCalls++;
      assert.equal(payload.username, 'tester');
      assert.equal(payload.password, ' password ');
      return loginResponse;
    }
  }, { navigateByUrl: url => { navigated = url; return Promise.resolve(true); } }, {
    snapshot: { queryParamMap: { get: () => target } }
  });
  login.form.patchValue({ username: '   ', password: ' password ' });
  login.login();
  assert.equal(loginCalls, 0, 'Whitespace-only username must not be submitted');
  login.form.patchValue({ username: ' tester ' });
  login.login(); login.login();
  assert.equal(loginCalls, 1, 'Login must block duplicate submissions');
  assert.equal(login.isLoading, true);
  loginResponse.error(new HttpErrorResponse({ status: 401 }));
  assert.equal(login.isLoading, false);
  assert.ok(login.error.includes('incorretos'));
  login.form.patchValue({ username: 'tester' });
  assert.equal(login.error, null, 'Editing clears the previous error');
  loginResponse = new rx.Subject();
  login.login(); loginResponse.error(new HttpErrorResponse({ status: 429 }));
  assert.ok(login.error.includes('Aguarde um minuto'));
  loginResponse = new rx.Subject();
  login.login(); loginResponse.next({}); loginResponse.complete();
  assert.equal(navigated, target, 'Login must restore the requested internal page');
  for (const invalid of ['https://example.com', '//example.com', '/auth/login', '/unknown']) {
    target = invalid;
    loginResponse = new rx.Subject();
    login.login(); loginResponse.next({}); loginResponse.complete();
    assert.equal(navigated, '/dashboard');
  }
  login.auth.hasAnyRole = required => required.includes('ROLE_ADMIN');
  for (const destination of ['', '/dashboard', '/sales/sale', '/stock']) {
    target = destination;
    loginResponse = new rx.Subject();
    login.login(); loginResponse.next({}); loginResponse.complete();
    assert.equal(navigated, '/users/allUser', 'Administrators land in user management');
  }
  const adminMenu = load('shared/models/menu.ts').menuItems.filter(item => item.roles.includes('ROLE_ADMIN'));
  assert.deepEqual(Array.from(adminMenu, item => item.link), ['/users/allUser', '/support']);
  login.ngOnDestroy();
  let savedUrl;
  const returnGuard = new AuthGuard({ isAuthenticated: () => false, getRefreshToken: () => null }, {
    createUrlTree: (commands, options) => { savedUrl = options.queryParams.returnUrl; return 'login'; }
  });
  assert.equal(returnGuard.canActivate(undefined, { url: '/sales/sale?client=1' }), 'login');
  assert.equal(savedUrl, '/sales/sale?client=1');
  require('sass').renderSync({ file: path.join(__dirname, '../src/app/pages/auth/login/login.component.scss') });

  console.log('Regression checks passed: login submission, errors, safe return URL, login SCSS, permissions, remote search, duplicate sales, dashboard errors, refresh concurrency, expired session, guard renewal, client loading and item editing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
