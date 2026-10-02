const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
const rx = require('rxjs');
(async () => {
  await import('@angular/compiler');
  const core = await import('@angular/core');
  const forms = await import('@angular/forms');
  const modules = { '@angular/core': core, '@angular/forms': forms, rxjs: rx,
    '@angular/material/dialog': { MAT_DIALOG_DATA: Symbol('dialog') },
    '@app/shared/models/client': { ClientType: { INDIVIDUAL: 'INDIVIDUAL', COMPANY: 'COMPANY' } },
    'browser-image-compression': { default: async () => { throw new Error('compression unavailable'); } }
  };
  function load(file) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true }
    }).outputText;
    vm.runInNewContext(source, { exports, console, require: name => modules[name] || {}, setTimeout, clearTimeout });
    return exports;
  }
  const fb = new forms.FormBuilder();
  const snackbar = { success() {}, error() { throw new Error('Duplicate/toast error instead of inline error'); } };
  const dialog = { close() {}, disableClose: false };
  const { AddProductComponent, productPriceValidator } = load('shared/dialog/product/add-product/add-product.component.ts');
  for (const value of [0, -1, NaN, Infinity, '12', 1.234, 100000000]) assert.ok(productPriceValidator(new forms.FormControl(value)));
  for (const value of [0.01, 12.34, 99999999.99]) assert.equal(productPriceValidator(new forms.FormControl(value)), null);
  const categoryResponse = new rx.Subject(), unitResponse = new rx.Subject();
  const speciesResponses = new Map();
  const saveResponse = new rx.Subject(); let saves = 0;
  const product = { id: 1, name: 'Original', description: '', price: 10, salePrice: 15, speciesId: 2, unitId: 3,
    species: { id: 2, categoryId: 4 }, unit: { id: 3, name: 'Quilo', symbol: 'kg' }, image: 'base64image' };
  const c = new AddProductComponent(fb, dialog, { update: payload => { saves++; assert.equal(payload.image, ''); return saveResponse; } },
    { findByCategoryId: id => { const stream = new rx.Subject(); speciesResponses.set(id, stream); return stream; } }, snackbar,
    { findAll: () => categoryResponse }, { findAll: () => unitResponse }, { product });
  c.ngOnInit();
  c.form.get('name').setValue('Alteração em curso');
  categoryResponse.next({ _embedded: { categorys: [{ id: 4, name: 'Categoria' }] } }); categoryResponse.complete();
  unitResponse.next({ _embedded: { Unit: [product.unit] } }); unitResponse.complete();
  speciesResponses.get(4).next([{ id: 2, name: 'Espécie' }]); speciesResponses.get(4).complete();
  assert.equal(c.form.get('name').value, 'Alteração em curso', 'Loading lists must not overwrite edits');
  assert.equal(c.form.get('speciesId').value, 2);
  assert.equal(c.priceUnit, 'MZN/kg');
  c.form.get('categoryId').setValue(5);
  const old = speciesResponses.get(5);
  c.form.get('categoryId').setValue(6);
  old.next([{ id: 50 }]); old.complete();
  speciesResponses.get(6).next([{ id: 60 }]); speciesResponses.get(6).complete();
  assert.equal(c.species[0].id, 60, 'Stale species response must not win');
  c.form.get('speciesId').setValue(60);
  c.removeImage(); assert.equal(c.imageBase64, null);
  c.processingImage = true; assert.equal(c.canSave, false); c.processingImage = false;
  c.salvar(); c.salvar(); assert.equal(saves, 1); assert.equal(dialog.disableClose, true);
  saveResponse.error({ error: { message: 'Falha de gravação' } });
  assert.equal(c.saveError, 'Falha de gravação'); assert.equal(c.isLoading, false);
  assert.equal(c.form.get('name').value, 'Alteração em curso'); assert.equal(c.form.enabled, true);
  assert.equal(dialog.disableClose, false);
  await c.onFileSelected({ target: { files: [{ type: 'application/pdf', size: 10 }], value: 'file' } });
  assert.ok(c.imageError); assert.equal(c.processingImage, false);
  c.ngOnDestroy();
  const Category = load('shared/dialog/settings/add-category/add-category.component.ts').AddCategoryComponent;
  let calls = 0; const response = new rx.Subject();
  const category = new Category(fb, dialog, { create: () => { calls++; return response; } }, snackbar, {});
  category.form.patchValue({ name: '   ', description: 'Teste' }); assert.equal(category.form.valid, false);
  category.form.get('name').setValue('Marisco'); category.salvar(); category.salvar(); assert.equal(calls, 1);
  response.error({ error: { detail: 'Falha' } }); assert.equal(category.saveError, 'Falha'); assert.equal(category.form.enabled, true);
  category.ngOnDestroy();
  const Client = load('shared/dialog/client/add-client/add-client.component.ts').AddClientComponent;
  const client = new Client(fb, dialog, {}, snackbar, { client: { id: 1, firstName: 'Ana', lastName: '', type: 'INDIVIDUAL', email: 'a@b.pt', phoneNumber: '841234567', address: 'Maputo' } });
  client.ngOnInit(); assert.equal(client.form.get('lastName').hasError('required'), true); client.ngOnDestroy();
  console.log('Form checks passed: prices, preserved edits, stale requests, image removal, image validation, busy states, retries, client validation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
