import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { DeliveryMethod, DeliverySettings, DeliveryZone, Shipment, ShipmentSummary } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

type Tab = 'zones' | 'shipments';

interface ZoneForm {
  store_id: string;
  name: string;
  description: string;
  match_type: string;
  countries: string;
  regions: string;
  cities: string;
  postcodes: string;
  base_fee: string;
  per_item_fee: string;
  per_kg_fee: string;
  free_over: string;
  min_days: string;
  max_days: string;
  priority: string;
  is_default: boolean;
  status: string;
}

interface MethodForm {
  delivery_zone_id: string;
  store_id: string;
  name: string;
  type: string;
  carrier: string;
  service_level: string;
  fee: string;
  free_over: string;
  min_days: string;
  max_days: string;
  pickup_address: string;
  pickup_hours: string;
  instructions: string;
  tracking_url_template: string;
  is_default: boolean;
  status: string;
}

const BLANK_ZONE: ZoneForm = {
  store_id: '',
  name: '',
  description: '',
  match_type: 'country',
  countries: '',
  regions: '',
  cities: '',
  postcodes: '',
  base_fee: '0',
  per_item_fee: '0',
  per_kg_fee: '0',
  free_over: '',
  min_days: '2',
  max_days: '5',
  priority: '0',
  is_default: false,
  status: 'active',
};

const BLANK_METHOD: MethodForm = {
  delivery_zone_id: '',
  store_id: '',
  name: '',
  type: 'courier',
  carrier: '',
  service_level: '',
  fee: '0',
  free_over: '',
  min_days: '2',
  max_days: '5',
  pickup_address: '',
  pickup_hours: '',
  instructions: '',
  tracking_url_template: '',
  is_default: false,
  status: 'active',
};

@Component({
  selector: 'app-seller-delivery',
  imports: [FormsModule, DatePipe, MoneyPipe],
  template: `
    <div class="wrap cx">
      <header class="cx-head">
        <div>
          <p class="eyebrow">Fulfilment</p>
          <h1>Delivery &amp; tracking</h1>
          <p class="intro">
            Define where you deliver, what it costs and how long it takes — then dispatch parcels and keep buyers
            updated with real tracking events.
          </p>
        </div>
        <div class="cx-head-actions">
          <button class="btn ghost" type="button" (click)="load()" [disabled]="loading()">Refresh</button>
        </div>
      </header>

      <div class="cx-tabs">
        <button type="button" [class.on]="tab() === 'zones'" (click)="tab.set('zones')">Zones &amp; methods <b>{{ zones().length }}</b></button>
        <button type="button" [class.on]="tab() === 'shipments'" (click)="switchToShipments()">Shipments <b>{{ shipmentSummary()?.total ?? 0 }}</b></button>
      </div>

      @if (message()) { <div class="cx-note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="cx-note bad" role="alert">{{ error() }}<button type="button" (click)="load()">Retry</button></div> }

      @if (tab() === 'zones') {
        <div class="cx-split">
          <section class="cx-panel">
            <header>
              <div><h2>Delivery zones</h2><p>Zones are matched top-down by priority. The first match wins.</p></div>
              <button class="mini go" type="button" (click)="newZone()">Add zone</button>
            </header>

            @if (loading()) {
              <div class="cx-skeleton"><span></span><span></span><span></span></div>
            } @else if (!zones().length) {
              <div class="cx-empty">
                <strong>No zones configured</strong>
                <p>Without a zone we fall back to your store's flat delivery fee. Add a zone for proper regional pricing.</p>
                <button class="btn" type="button" (click)="newZone()">Create your first zone</button>
              </div>
            } @else {
              <div class="cx-panel-body cx-list">
                @for (zone of zones(); track zone.id) {
                  <article class="cx-item">
                    <div class="top">
                      <strong>{{ zone.name }}</strong>
                      <span class="chip plain">{{ pretty(zone.match_type) }}</span>
                      @if (zone.is_default) { <span class="chip ok plain">Default</span> }
                      <span class="chip" [class]="'chip ' + zone.status">{{ pretty(zone.status) }}</span>
                      <span class="when">Priority {{ zone.priority }}</span>
                    </div>
                    <p>{{ coverage(zone) }}</p>
                    <p class="muted">
                      Base {{ zone.base_fee | money }} · per item {{ zone.per_item_fee | money }} ·
                      {{ zone.min_days }}–{{ zone.max_days }} days
                      @if (zone.free_over) { <span> · free over {{ zone.free_over | money }}</span> }
                    </p>

                    @if (zone.methods.length) {
                      <div class="methods">
                        @for (method of zone.methods; track method.id) {
                          <div class="method">
                            <div>
                              <strong>{{ method.name }}</strong>
                              <span class="muted"> · {{ pretty(method.type) }}@if (method.carrier) { <span> · {{ method.carrier }}</span> }</span>
                            </div>
                            <span class="muted">{{ method.fee | money }} · {{ method.min_days }}–{{ method.max_days }} days</span>
                            <button class="mini" type="button" (click)="editMethod(method)">Edit</button>
                            <button class="mini danger" type="button" (click)="deleteMethod(method)">Remove</button>
                          </div>
                        }
                      </div>
                    }

                    <div class="top">
                      <button class="mini" type="button" (click)="editZone(zone)">Edit zone</button>
                      <button class="mini" type="button" (click)="newMethod(zone)">Add method</button>
                      <button class="mini danger" type="button" (click)="deleteZone(zone)">Delete zone</button>
                    </div>
                  </article>
                }
              </div>
            }

            @if (unzonedMethods().length) {
              <footer>
                <span>{{ unzonedMethods().length }} store-wide method(s) available in every zone.</span>
                <button class="mini" type="button" (click)="newMethod(null)">Add store-wide method</button>
              </footer>
            }
          </section>

          <aside class="cx-panel">
            @if (zoneForm()) {
              <header><div><h2>{{ editingZone() ? 'Edit zone' : 'New zone' }}</h2><p>Where you deliver and what it costs.</p></div></header>
              <div class="cx-panel-body cx-form">
                <div class="row">
                  <label>
                    Store
                    <select [(ngModel)]="zf.store_id" name="zstore">
                      <option value="">All my stores</option>
                      @for (store of settings()?.stores || []; track store.id) { <option [value]="store.id">{{ store.name }}</option> }
                    </select>
                  </label>
                  <label>Zone name<input [(ngModel)]="zf.name" name="zname" placeholder="Metro area" /></label>
                </div>
                <div class="row">
                  <label>
                    Match on
                    <select [(ngModel)]="zf.match_type" name="zmatch">
                      @for (option of settings()?.match_types || []; track option) { <option [value]="option">{{ pretty(option) }}</option> }
                    </select>
                  </label>
                  <label>Priority<input type="number" [(ngModel)]="zf.priority" name="zpriority" /></label>
                </div>
                @switch (zf.match_type) {
                  @case ('country') { <label>Countries<input [(ngModel)]="zf.countries" name="zcountries" placeholder="US, CA, GB" /><span class="hint">Comma separated ISO codes.</span></label> }
                  @case ('region') { <label>Regions / states<input [(ngModel)]="zf.regions" name="zregions" placeholder="California, Texas" /></label> }
                  @case ('city') { <label>Cities<input [(ngModel)]="zf.cities" name="zcities" placeholder="Lagos, Abuja" /></label> }
                  @case ('postcode') { <label>Postcodes<input [(ngModel)]="zf.postcodes" name="zpostcodes" placeholder="10001, 10002" /></label> }
                }
                <div class="row">
                  <label>Base fee<input type="number" min="0" step="0.01" [(ngModel)]="zf.base_fee" name="zbase" /></label>
                  <label>Per item<input type="number" min="0" step="0.01" [(ngModel)]="zf.per_item_fee" name="zitem" /></label>
                  <label>Per kg<input type="number" min="0" step="0.01" [(ngModel)]="zf.per_kg_fee" name="zkg" /></label>
                </div>
                <div class="row">
                  <label>Free over<input type="number" min="0" step="0.01" [(ngModel)]="zf.free_over" name="zfree" placeholder="Never" /></label>
                  <label>Min days<input type="number" min="0" [(ngModel)]="zf.min_days" name="zmin" /></label>
                  <label>Max days<input type="number" min="0" [(ngModel)]="zf.max_days" name="zmax" /></label>
                </div>
                <label class="check"><input type="checkbox" [(ngModel)]="zf.is_default" name="zdefault" /> Use as the fallback zone</label>
                <label class="check"><input type="checkbox" [checked]="zf.status === 'active'" (change)="zf.status = zf.status === 'active' ? 'inactive' : 'active'" /> Active</label>
                <div class="actions">
                  <button class="btn" type="button" (click)="saveZone()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save zone' }}</button>
                  <button class="btn ghost" type="button" (click)="zoneForm.set(false)">Cancel</button>
                </div>
              </div>
            } @else if (methodForm()) {
              <header><div><h2>{{ editingMethod() ? 'Edit method' : 'New delivery method' }}</h2><p>What the shopper picks at checkout.</p></div></header>
              <div class="cx-panel-body cx-form">
                <div class="row">
                  <label>Name<input [(ngModel)]="mf.name" name="mname" placeholder="Express courier" /></label>
                  <label>
                    Type
                    <select [(ngModel)]="mf.type" name="mtype">
                      @for (option of settings()?.method_types || []; track option) { <option [value]="option">{{ pretty(option) }}</option> }
                    </select>
                  </label>
                </div>
                <div class="row">
                  <label>Carrier<input [(ngModel)]="mf.carrier" name="mcarrier" placeholder="DHL" /></label>
                  <label>Service level<input [(ngModel)]="mf.service_level" name="mservice" placeholder="Next day" /></label>
                </div>
                <div class="row">
                  <label>Fee<input type="number" min="0" step="0.01" [(ngModel)]="mf.fee" name="mfee" /></label>
                  <label>Free over<input type="number" min="0" step="0.01" [(ngModel)]="mf.free_over" name="mfree" placeholder="Never" /></label>
                </div>
                <div class="row">
                  <label>Min days<input type="number" min="0" [(ngModel)]="mf.min_days" name="mmin" /></label>
                  <label>Max days<input type="number" min="0" [(ngModel)]="mf.max_days" name="mmax" /></label>
                </div>
                @if (mf.type === 'pickup') {
                  <label>Pickup address<textarea [(ngModel)]="mf.pickup_address" name="mpickup"></textarea></label>
                  <label>Pickup hours<input [(ngModel)]="mf.pickup_hours" name="mhours" placeholder="Mon–Fri 9am–5pm" /></label>
                }
                <label>Tracking URL template<input [(ngModel)]="mf.tracking_url_template" name="mtrack" placeholder="https://carrier.com/track/{{ '{' }}tracking_number{{ '}' }}" /></label>
                <label>Instructions<textarea [(ngModel)]="mf.instructions" name="minstructions" placeholder="Shown to the shopper at checkout"></textarea></label>
                <label class="check"><input type="checkbox" [(ngModel)]="mf.is_default" name="mdefault" /> Pre-select this option</label>
                <div class="actions">
                  <button class="btn" type="button" (click)="saveMethod()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save method' }}</button>
                  <button class="btn ghost" type="button" (click)="methodForm.set(false)">Cancel</button>
                </div>
              </div>
            } @else {
              <header><div><h2>How delivery pricing works</h2><p>Checkout picks the cheapest matching option by default.</p></div></header>
              <div class="cx-panel-body">
                <ol class="howto">
                  <li>We match the shopper's address against your zones, highest priority first.</li>
                  <li>The matching zone's methods become the checkout options for that store.</li>
                  <li>Fees are <em>base + per item × qty</em>, waived once the basket passes “free over”.</li>
                  <li>No zone matches? The store's flat delivery fee is used as a safe fallback.</li>
                </ol>
                <button class="btn" type="button" (click)="newZone()">Add a zone</button>
              </div>
            }
          </aside>
        </div>
      } @else {
        <section class="cx-stats">
          <div class="cx-stat"><span>Shipments</span><strong>{{ shipmentSummary()?.total ?? 0 }}</strong><small>All time</small></div>
          <div class="cx-stat warn"><span>Awaiting dispatch</span><strong>{{ shipmentSummary()?.awaiting_dispatch ?? 0 }}</strong><small>Not yet handed over</small></div>
          <div class="cx-stat"><span>In transit</span><strong>{{ shipmentSummary()?.in_transit ?? 0 }}</strong><small>On the way</small></div>
          <div class="cx-stat bad"><span>Problems</span><strong>{{ shipmentSummary()?.problem ?? 0 }}</strong><small>Failed or returned</small></div>
        </section>

        <div class="cx-toolbar">
          <input type="search" [(ngModel)]="query" name="sq" placeholder="Search reference, tracking or recipient" (keyup.enter)="loadShipments()" />
          <select [(ngModel)]="shipmentStatus" name="sstatus" (ngModelChange)="loadShipments()">
            <option value="">All statuses</option>
            @for (option of settings()?.shipment_statuses || []; track option) { <option [value]="option">{{ label(option) }}</option> }
          </select>
        </div>

        <div class="cx-split">
          <section class="cx-panel">
            <header><div><h2>Shipments</h2><p>{{ shipments().length }} on this page.</p></div></header>
            @if (!shipments().length) {
              <div class="cx-empty"><strong>Nothing to ship</strong><p>Shipments appear automatically when an order is paid.</p></div>
            } @else {
              <div class="cx-table-scroll">
                <table class="cx-table">
                  <thead><tr><th>Reference</th><th>Recipient</th><th>Carrier</th><th>Status</th><th>Expected</th><th class="act"></th></tr></thead>
                  <tbody>
                    @for (parcel of shipments(); track parcel.id) {
                      <tr [class.on]="selected()?.id === parcel.id" (click)="select(parcel)">
                        <td><strong>{{ parcel.reference }}</strong><span class="sub">Order #{{ parcel.order_id }}</span></td>
                        <td>{{ parcel.recipient_name || '—' }}<span class="sub">{{ parcel.destination }}</span></td>
                        <td>{{ parcel.carrier || pretty(parcel.type) }}<span class="sub">{{ parcel.tracking_number || 'No tracking number' }}</span></td>
                        <td><span class="chip" [class]="'chip ' + parcel.status">{{ parcel.status_label }}</span></td>
                        <td>{{ parcel.estimated_delivery_to ? (parcel.estimated_delivery_to | date: 'MMM d') : '—' }}</td>
                        <td class="act"><button class="mini" type="button">Manage</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer>
                <span>Page {{ page() }} of {{ lastPage() }}</span>
                <span class="cx-pager">
                  <button type="button" [disabled]="page() <= 1" (click)="goShipments(page() - 1)">Previous</button>
                  <button type="button" [disabled]="page() >= lastPage()" (click)="goShipments(page() + 1)">Next</button>
                </span>
              </footer>
            }
          </section>

          <aside class="cx-panel">
            @if (selected(); as parcel) {
              <header>
                <div><h2>{{ parcel.reference }}</h2><p>{{ parcel.store?.name }} · order #{{ parcel.order_id }}</p></div>
                <span class="chip" [class]="'chip ' + parcel.status">{{ parcel.status_label }}</span>
              </header>
              <div class="cx-panel-body cx-form">
                <div class="row">
                  <label>Carrier<input [(ngModel)]="ship.carrier" name="pcarrier" /></label>
                  <label>Tracking number<input [(ngModel)]="ship.tracking_number" name="ptracking" /></label>
                </div>
                <div class="row">
                  <label>
                    Status
                    <select [(ngModel)]="ship.status" name="pstatus">
                      @for (option of settings()?.shipment_statuses || []; track option) { <option [value]="option">{{ label(option) }}</option> }
                    </select>
                  </label>
                  <label>Shipping cost<input type="number" min="0" step="0.01" [(ngModel)]="ship.cost" name="pcost" /></label>
                </div>
                <label>Internal notes<textarea [(ngModel)]="ship.notes" name="pnotes"></textarea></label>
                <div class="actions">
                  <button class="btn" type="button" (click)="saveShipment(parcel)" [disabled]="busy()">Update shipment</button>
                </div>

                <label>
                  Add a tracking event
                  <input [(ngModel)]="eventDescription" name="pevent" placeholder="Left our warehouse" />
                </label>
                <div class="row">
                  <label>
                    Event status
                    <select [(ngModel)]="eventStatus" name="pevstatus">
                      @for (option of settings()?.shipment_statuses || []; track option) { <option [value]="option">{{ label(option) }}</option> }
                    </select>
                  </label>
                  <label>Location<input [(ngModel)]="eventLocation" name="pevloc" placeholder="Lagos hub" /></label>
                </div>
                <div class="actions">
                  <button class="btn ghost" type="button" (click)="addEvent(parcel)" [disabled]="busy() || !eventDescription.trim()">Record event</button>
                </div>

                <ol class="timeline">
                  @for (event of parcel.events || []; track event.id) {
                    <li>
                      <span class="dot"></span>
                      <div>
                        <strong>{{ label(event.status) }}</strong>
                        <p>{{ event.description }}@if (event.location) { <span class="muted"> · {{ event.location }}</span> }</p>
                        <small class="muted">{{ event.happened_at ? (event.happened_at | date: 'MMM d, HH:mm') : '' }}</small>
                      </div>
                    </li>
                  }
                </ol>
              </div>
            } @else {
              <div class="cx-empty"><strong>Pick a shipment</strong><p>Select a parcel to add tracking details and events.</p></div>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .methods { display: grid; gap: 6px; margin-top: 4px; }
      .method { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-2); font-size: 12px; }
      .method > div:first-child { flex: 1 1 180px; }
      .howto { margin: 0 0 16px; padding-left: 18px; display: grid; gap: 9px; font-size: 12.5px; line-height: 1.55; color: var(--ink-soft); }
      .timeline { list-style: none; margin: 16px 0 0; padding: 0 0 0 4px; display: grid; gap: 13px; }
      .timeline li { display: flex; gap: 12px; position: relative; }
      .timeline li:not(:last-child)::before { content: ''; position: absolute; left: 4px; top: 15px; bottom: -15px; width: 1px; background: var(--line); }
      .dot { width: 9px; height: 9px; margin-top: 5px; flex: none; border-radius: 50%; background: var(--accent); }
      .timeline p { margin: 2px 0; font-size: 12px; }
      .timeline strong { font-size: 12px; }
    `,
  ],
})
export class SellerDeliveryComponent {
  private api = inject(ApiService);

  tab = signal<Tab>('zones');
  settings = signal<DeliverySettings | null>(null);
  shipments = signal<Shipment[]>([]);
  shipmentSummary = signal<ShipmentSummary | null>(null);
  selected = signal<Shipment | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  page = signal(1);
  lastPage = signal(1);

  zoneForm = signal(false);
  methodForm = signal(false);
  editingZone = signal<DeliveryZone | null>(null);
  editingMethod = signal<DeliveryMethod | null>(null);

  query = '';
  shipmentStatus = '';
  eventStatus = 'in_transit';
  eventDescription = '';
  eventLocation = '';

  zf: ZoneForm = { ...BLANK_ZONE };
  mf: MethodForm = { ...BLANK_METHOD };
  ship = { carrier: '', tracking_number: '', status: 'pending', cost: '0', notes: '' };

  zones = computed<DeliveryZone[]>(() => this.settings()?.zones ?? []);
  unzonedMethods = computed<DeliveryMethod[]>(() => (this.settings()?.methods ?? []).filter((m) => !m.delivery_zone_id));

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.deliverySettings().subscribe({
      next: (res) => {
        this.settings.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('We could not load your delivery settings.');
      },
    });
  }

  switchToShipments() {
    this.tab.set('shipments');
    if (!this.shipments().length) this.loadShipments();
  }

  loadShipments() {
    const params: Record<string, string> = { page: String(this.page()), per_page: '20' };
    if (this.query.trim()) params['q'] = this.query.trim();
    if (this.shipmentStatus) params['status'] = this.shipmentStatus;

    this.api.tenantShipments(params).subscribe({
      next: (res) => {
        this.shipments.set(res.data || []);
        this.shipmentSummary.set(res.summary);
        this.lastPage.set(res.meta?.last_page || 1);
      },
      error: () => this.error.set('We could not load your shipments.'),
    });
  }

  goShipments(page: number) {
    this.page.set(Math.max(1, Math.min(page, this.lastPage())));
    this.loadShipments();
  }

  select(parcel: Shipment) {
    this.api.tenantShipment(parcel.id).subscribe({
      next: (res) => {
        const full = res.data;
        this.selected.set(full);
        this.ship = {
          carrier: full.carrier || '',
          tracking_number: full.tracking_number || '',
          status: full.status,
          cost: String(full.cost ?? '0'),
          notes: full.notes || '',
        };
      },
      error: () => this.error.set('We could not open that shipment.'),
    });
  }

  saveShipment(parcel: Shipment) {
    this.busy.set(true);
    this.api
      .updateShipment(parcel.id, {
        carrier: this.ship.carrier || null,
        tracking_number: this.ship.tracking_number || null,
        status: this.ship.status,
        cost: Number(this.ship.cost || 0),
        notes: this.ship.notes || null,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.selected.set(res.data);
          this.message.set('Shipment updated — the buyer has been notified.');
          this.loadShipments();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'That shipment could not be updated.');
        },
      });
  }

  addEvent(parcel: Shipment) {
    this.busy.set(true);
    this.api
      .addShipmentEvent(parcel.id, {
        status: this.eventStatus,
        description: this.eventDescription.trim(),
        location: this.eventLocation || null,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.selected.set(res.data);
          this.eventDescription = '';
          this.eventLocation = '';
          this.message.set('Tracking event recorded.');
        },
        error: () => {
          this.busy.set(false);
          this.error.set('That event could not be recorded.');
        },
      });
  }

  // ---- zones ---------------------------------------------------------------

  newZone() {
    this.editingZone.set(null);
    this.zf = { ...BLANK_ZONE };
    this.methodForm.set(false);
    this.zoneForm.set(true);
  }

  editZone(zone: DeliveryZone) {
    this.editingZone.set(zone);
    this.zf = {
      store_id: zone.store_id ? String(zone.store_id) : '',
      name: zone.name,
      description: zone.description || '',
      match_type: zone.match_type,
      countries: (zone.countries || []).join(', '),
      regions: (zone.regions || []).join(', '),
      cities: (zone.cities || []).join(', '),
      postcodes: (zone.postcodes || []).join(', '),
      base_fee: String(zone.base_fee ?? '0'),
      per_item_fee: String(zone.per_item_fee ?? '0'),
      per_kg_fee: String(zone.per_kg_fee ?? '0'),
      free_over: zone.free_over ? String(zone.free_over) : '',
      min_days: String(zone.min_days ?? 2),
      max_days: String(zone.max_days ?? 5),
      priority: String(zone.priority ?? 0),
      is_default: zone.is_default,
      status: zone.status,
    };
    this.methodForm.set(false);
    this.zoneForm.set(true);
  }

  saveZone() {
    const list = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean);
    const payload = {
      store_id: this.zf.store_id ? Number(this.zf.store_id) : null,
      name: this.zf.name.trim(),
      description: this.zf.description || null,
      match_type: this.zf.match_type,
      countries: list(this.zf.countries),
      regions: list(this.zf.regions),
      cities: list(this.zf.cities),
      postcodes: list(this.zf.postcodes),
      base_fee: Number(this.zf.base_fee || 0),
      per_item_fee: Number(this.zf.per_item_fee || 0),
      per_kg_fee: Number(this.zf.per_kg_fee || 0),
      free_over: this.zf.free_over === '' ? null : Number(this.zf.free_over),
      min_days: Number(this.zf.min_days || 0),
      max_days: Number(this.zf.max_days || 0),
      priority: Number(this.zf.priority || 0),
      is_default: this.zf.is_default,
      status: this.zf.status,
    };

    this.busy.set(true);
    const existing = this.editingZone();
    const call = existing ? this.api.updateDeliveryZone(existing.id, payload) : this.api.createDeliveryZone(payload);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.zoneForm.set(false);
        this.message.set(existing ? 'Zone updated.' : 'Zone created.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That zone could not be saved.');
      },
    });
  }

  deleteZone(zone: DeliveryZone) {
    this.api.deleteDeliveryZone(zone.id).subscribe({
      next: () => {
        this.message.set(`${zone.name} removed.`);
        this.load();
      },
      error: () => this.error.set('That zone could not be deleted.'),
    });
  }

  // ---- methods -------------------------------------------------------------

  newMethod(zone: DeliveryZone | null) {
    this.editingMethod.set(null);
    this.mf = { ...BLANK_METHOD, delivery_zone_id: zone ? String(zone.id) : '', store_id: zone?.store_id ? String(zone.store_id) : '' };
    this.zoneForm.set(false);
    this.methodForm.set(true);
  }

  editMethod(method: DeliveryMethod) {
    this.editingMethod.set(method);
    this.mf = {
      delivery_zone_id: method.delivery_zone_id ? String(method.delivery_zone_id) : '',
      store_id: method.store_id ? String(method.store_id) : '',
      name: method.name,
      type: method.type,
      carrier: method.carrier || '',
      service_level: method.service_level || '',
      fee: String(method.fee ?? '0'),
      free_over: method.free_over ? String(method.free_over) : '',
      min_days: String(method.min_days ?? 2),
      max_days: String(method.max_days ?? 5),
      pickup_address: method.pickup_address || '',
      pickup_hours: method.pickup_hours || '',
      instructions: method.instructions || '',
      tracking_url_template: method.tracking_url_template || '',
      is_default: method.is_default,
      status: method.status,
    };
    this.zoneForm.set(false);
    this.methodForm.set(true);
  }

  saveMethod() {
    const payload = {
      delivery_zone_id: this.mf.delivery_zone_id ? Number(this.mf.delivery_zone_id) : null,
      store_id: this.mf.store_id ? Number(this.mf.store_id) : null,
      name: this.mf.name.trim(),
      type: this.mf.type,
      carrier: this.mf.carrier || null,
      service_level: this.mf.service_level || null,
      fee: Number(this.mf.fee || 0),
      free_over: this.mf.free_over === '' ? null : Number(this.mf.free_over),
      min_days: Number(this.mf.min_days || 0),
      max_days: Number(this.mf.max_days || 0),
      pickup_address: this.mf.pickup_address || null,
      pickup_hours: this.mf.pickup_hours || null,
      instructions: this.mf.instructions || null,
      tracking_url_template: this.mf.tracking_url_template || null,
      is_default: this.mf.is_default,
      status: this.mf.status,
    };

    this.busy.set(true);
    const existing = this.editingMethod();
    const call = existing ? this.api.updateDeliveryMethod(existing.id, payload) : this.api.createDeliveryMethod(payload);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.methodForm.set(false);
        this.message.set(existing ? 'Method updated.' : 'Method added.');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'That method could not be saved.');
      },
    });
  }

  deleteMethod(method: DeliveryMethod) {
    this.api.deleteDeliveryMethod(method.id).subscribe({
      next: () => {
        this.message.set(`${method.name} removed.`);
        this.load();
      },
      error: () => this.error.set('That method could not be deleted.'),
    });
  }

  coverage(zone: DeliveryZone): string {
    const parts = [...(zone.countries || []), ...(zone.regions || []), ...(zone.cities || []), ...(zone.postcodes || [])];
    if (!parts.length) return zone.match_type === 'any' ? 'Matches every address' : 'No locations set yet';
    return parts.slice(0, 8).join(', ') + (parts.length > 8 ? ` +${parts.length - 8} more` : '');
  }

  label(status: string): string {
    return this.settings()?.status_labels?.[status] || this.pretty(status);
  }

  pretty(value: string | null | undefined): string {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
