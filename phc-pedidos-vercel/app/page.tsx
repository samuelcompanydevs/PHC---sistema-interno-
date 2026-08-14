"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { products, type Product } from "../lib/catalog";

type Tab = "orders" | "new" | "reports" | "settings";
type Status = "received" | "preparing" | "ready" | "delivered" | "cancelled";
type Range = "today" | "week" | "month";

type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type CustomExtra = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  attendant: string;
  paymentMethod: string;
  amountReceived: number | null;
  total: number;
  status: Status;
  notes: string;
  updatedBy: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

const attendants = ["Romualdo", "Penélope", "Patricia", "Atendente 3"];
const paymentMethods = ["Pix", "Dinheiro", "Débito", "Crédito"];

const statusInfo: Record<Status, { label: string; next?: Status }> = {
  received: { label: "Recebido", next: "preparing" },
  preparing: { label: "Em preparo", next: "ready" },
  ready: { label: "Pronto", next: "delivered" },
  delivered: { label: "Entregue" },
  cancelled: { label: "Cancelado" },
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function startFor(range: Range) {
  const now = new Date();
  if (range === "today") now.setHours(0, 0, 0, 0);
  if (range === "week") {
    const day = now.getDay();
    const distance = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - distance);
    now.setHours(0, 0, 0, 0);
  }
  if (range === "month") {
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
  }
  return now;
}

function BottomNav({ tab, setTab, cartCount }: { tab: Tab; setTab: (tab: Tab) => void; cartCount: number }) {
  const entries: Array<{ id: Tab; icon: string; label: string }> = [
    { id: "orders", icon: "▤", label: "Pedidos" },
    { id: "new", icon: "+", label: "Novo" },
    { id: "reports", icon: "↗", label: "Relatórios" },
    { id: "settings", icon: "⚙", label: "Ajustes" },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {entries.map((entry) => (
        <button key={entry.id} className={tab === entry.id ? "active" : ""} onClick={() => setTab(entry.id)}>
          <span className={`nav-icon ${entry.id === "new" ? "new-icon" : ""}`}>{entry.icon}</span>
          <span>{entry.label}</span>
          {entry.id === "new" && cartCount > 0 && <b className="nav-badge">{cartCount}</b>}
        </button>
      ))}
    </nav>
  );
}

function Header({ attendant, setAttendant }: { attendant: string; setAttendant: (value: string) => void }) {
  return (
    <header className="topbar">
      <div className="brand-mark">
        <Image
          src="/phc-logo-header.png"
          alt="Logo PHC Espetinho"
          width={60}
          height={60}
          priority
          unoptimized
        />
      </div>
      <div className="topbar-copy">
        <span>Operação do quiosque</span>
        <strong>PHC Pedidos</strong>
      </div>
      <label className="attendant-select">
        <span>Atendente</span>
        <select value={attendant} onChange={(event) => setAttendant(event.target.value)} aria-label="Atendente atual">
          {attendants.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
    </header>
  );
}

function OrdersView({ orders, loading, refresh, updateStatus, onNew, onEdit, onCancel, onDelete, attendant }: {
  orders: Order[];
  loading: boolean;
  refresh: () => void;
  updateStatus: (id: string, status: Status) => Promise<void>;
  onNew: () => void;
  onEdit: (order: Order) => void;
  onCancel: (id: string, reason: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  attendant: string;
}) {
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const active = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const delivered = orders.filter((order) => order.status === "delivered");
  const closed = orders.filter((order) => ["delivered", "cancelled"].includes(order.status));
  const todayTotal = delivered.reduce((sum, order) => sum + order.total, 0);

  async function confirmCancellation() {
    if (!cancelTarget || !cancelReason.trim()) {
      setCancelError("Informe o motivo do cancelamento.");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      await onCancel(cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason("");
    } catch (caught) {
      setCancelError(caught instanceof Error ? caught.message : "Não foi possível cancelar o pedido.");
    } finally {
      setCancelling(false);
    }
  }

  async function confirmDeletion() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Não foi possível excluir o pedido.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="view-section">
      <div className="welcome-row">
        <div><span className="eyebrow">HOJE NO QUIOSQUE</span><h1>Pedidos em andamento</h1></div>
        <button className="round-refresh" onClick={refresh} aria-label="Atualizar pedidos">↻</button>
      </div>

      <div className="summary-strip">
        <div><span>Vendido hoje</span><strong>{money.format(todayTotal)}</strong></div>
        <div><span>Pedidos</span><strong>{orders.length}</strong></div>
        <div><span>Em preparo</span><strong>{active.length}</strong></div>
      </div>

      {loading ? <div className="empty-state"><span className="loader" />Atualizando pedidos...</div> : active.length === 0 ? (
        <div className="empty-state tall">
          <div className="empty-icon">🔥</div>
          <h2>Nenhum pedido na fila</h2>
          <p>O próximo pedido feito no balcão aparecerá aqui para toda a equipe.</p>
          <button className="primary-button" onClick={onNew}>+ Registrar primeiro pedido</button>
        </div>
      ) : (
        <div className="order-list">
          {active.map((order) => {
            const info = statusInfo[order.status];
            return (
              <article className={`order-card status-${order.status}`} key={order.id}>
                <div className="order-card-top">
                  <div><span>#{order.orderNumber.slice(-5)}</span><strong>{order.customerName}</strong></div>
                  <time>{new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <p>{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</p>
                {order.notes && <small className="order-note">Obs.: {order.notes}</small>}
                <div className="secondary-actions">
                  <button className="edit-order-button" onClick={() => onEdit(order)}>✎ Editar</button>
                  <button className="cancel-order-button" onClick={() => { setCancelTarget(order); setCancelReason(""); setCancelError(""); }}>Cancelar</button>
                  <button className="delete-order-button" onClick={() => { setDeleteTarget(order); setDeleteError(""); }}>Excluir</button>
                </div>
                <div className="order-card-bottom">
                  <div><span>{order.paymentMethod}</span><strong>{money.format(order.total)}</strong></div>
                  <div className="order-actions">
                    <span className="status-pill">{info.label}</span>
                    {info.next && <button onClick={() => updateStatus(order.id, info.next!)}>{info.next === "delivered" ? "Entregar" : "Avançar"} →</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && closed.length > 0 && (
        <div className="closed-orders">
          <div className="section-heading"><h2>Encerrados hoje</h2><span>{closed.length} pedidos</span></div>
          {closed.map((order) => (
            <article className={`closed-order ${order.status === "cancelled" ? "is-cancelled" : ""}`} key={order.id}>
              <div><strong>#{order.orderNumber.slice(-5)} · {order.customerName}</strong><span>{statusInfo[order.status].label}{order.cancelledBy ? ` por ${order.cancelledBy}` : ""}</span></div>
              <strong>{order.status === "cancelled" ? "—" : money.format(order.total)}</strong>
              <button className="closed-delete-button" onClick={() => { setDeleteTarget(order); setDeleteError(""); }} aria-label={`Excluir pedido ${order.orderNumber}`}>Excluir</button>
              {order.cancelReason && <small>Motivo: {order.cancelReason}</small>}
            </article>
          ))}
        </div>
      )}

      {cancelTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCancelTarget(null); }}>
          <section className="cancel-sheet" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="cancel-symbol">!</div>
            <h2 id="cancel-title">Cancelar pedido #{cancelTarget.orderNumber.slice(-5)}?</h2>
            <p>Ele será retirado dos resultados, mas continuará no histórico para conferência.</p>
            <div className="field-group">
              <label htmlFor="cancel-reason">Motivo do cancelamento</label>
              <textarea id="cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ex.: pedido lançado em duplicidade" rows={3} autoFocus />
            </div>
            <small className="cancelled-by">Responsável: <strong>{attendant}</strong></small>
            {cancelError && <p className="error-message">{cancelError}</p>}
            <div className="modal-actions">
              <button className="keep-order-button" onClick={() => setCancelTarget(null)}>Manter pedido</button>
              <button className="confirm-cancel-button" onClick={confirmCancellation} disabled={cancelling}>{cancelling ? "Cancelando..." : "Confirmar cancelamento"}</button>
            </div>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <section className="cancel-sheet delete-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="delete-symbol">×</div>
            <h2 id="delete-title">Excluir pedido #{deleteTarget.orderNumber.slice(-5)}?</h2>
            <p>Esta ação é permanente. O pedido será removido do histórico, dos totais e da planilha, sem afetar os outros pedidos.</p>
            <div className="delete-summary">
              <span>{deleteTarget.customerName}</span>
              <strong>{money.format(deleteTarget.total)}</strong>
            </div>
            <small className="cancelled-by">Responsável: <strong>{attendant}</strong></small>
            {deleteError && <p className="error-message">{deleteError}</p>}
            <div className="modal-actions">
              <button className="keep-order-button" onClick={() => setDeleteTarget(null)}>Voltar</button>
              <button className="confirm-delete-button" onClick={confirmDeletion} disabled={deleting}>{deleting ? "Excluindo..." : "Excluir definitivamente"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function ProductCard({ product, quantity, change }: { product: Product; quantity: number; change: (id: string, delta: number) => void }) {
  return (
    <article className={`product-card ${quantity ? "selected" : ""}`}>
      <button className="product-main" onClick={() => change(product.id, 1)} aria-label={`Adicionar ${product.name}`}>
        <span className="product-emoji">{product.emoji}</span>
        <span><strong>{product.shortName}</strong><small>{money.format(product.price)}</small></span>
      </button>
      {quantity > 0 && (
        <div className="quantity-control">
          <button onClick={() => change(product.id, -1)} aria-label={`Remover ${product.name}`}>−</button>
          <strong>{quantity}</strong>
          <button onClick={() => change(product.id, 1)} aria-label={`Adicionar mais ${product.name}`}>+</button>
        </div>
      )}
    </article>
  );
}

function NewOrderView({ cart, change, attendant, editingOrder, onSaved, onStopEditing }: {
  cart: Record<string, number>;
  change: (id: string, delta: number) => void;
  attendant: string;
  editingOrder: Order | null;
  onSaved: (edited: boolean) => void;
  onStopEditing: () => void;
}) {
  const [category, setCategory] = useState<"Todos" | Product["category"] | "Extras">("Todos");
  const [customerName, setCustomerName] = useState(editingOrder?.customerName === "Balcão" ? "" : editingOrder?.customerName || "");
  const [notes, setNotes] = useState(editingOrder?.notes || "");
  const [paymentMethod, setPaymentMethod] = useState(editingOrder?.paymentMethod || "Pix");
  const [amountReceived, setAmountReceived] = useState(editingOrder?.amountReceived == null ? "" : String(editingOrder.amountReceived));
  const [showCheckout, setShowCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [extraError, setExtraError] = useState("");
  const [customExtras, setCustomExtras] = useState<CustomExtra[]>(() =>
    (editingOrder?.items || [])
      .filter((item) => !products.some((product) => product.id === item.productId))
      .map((item) => ({ id: item.productId, name: item.productName, price: item.unitPrice, quantity: item.quantity })),
  );

  const selected = products.filter((product) => cart[product.id] > 0);
  const selectedExtras = customExtras.filter((extra) => extra.quantity > 0);
  const count = selected.reduce((sum, product) => sum + cart[product.id], 0) + selectedExtras.reduce((sum, extra) => sum + extra.quantity, 0);
  const total = selected.reduce((sum, product) => sum + product.price * cart[product.id], 0) + selectedExtras.reduce((sum, extra) => sum + extra.price * extra.quantity, 0);
  const filtered = category === "Todos" ? products : category === "Extras" ? [] : products.filter((product) => product.category === category);
  const changeDue = paymentMethod === "Dinheiro" && Number(amountReceived) >= total ? Number(amountReceived) - total : 0;

  function addExtra() {
    const name = extraName.trim();
    const price = Number(extraPrice.replace(",", "."));
    if (!name) {
      setExtraError("Digite o nome do extra.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setExtraError("Digite um valor válido para o extra.");
      return;
    }
    setCustomExtras((current) => [...current, { id: `extra-${crypto.randomUUID()}`, name, price: Math.round(price * 100) / 100, quantity: 1 }]);
    setExtraName("");
    setExtraPrice("");
    setExtraError("");
  }

  function changeExtra(id: string, delta: number) {
    setCustomExtras((current) => current
      .map((extra) => extra.id === id ? { ...extra, quantity: Math.max(0, extra.quantity + delta) } : extra)
      .filter((extra) => extra.quantity > 0));
  }

  async function saveOrder() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editingOrder ? `/api/orders/${editingOrder.id}` : "/api/orders", {
        method: editingOrder ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName,
          attendant,
          paymentMethod,
          amountReceived: paymentMethod === "Dinheiro" && amountReceived ? Number(amountReceived) : null,
          notes,
          items: [
            ...selected.map((product) => ({ productId: product.id, quantity: cart[product.id] })),
            ...selectedExtras.map((extra) => ({ productId: extra.id, productName: extra.name, category: "Extras", unitPrice: extra.price, quantity: extra.quantity })),
          ],
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o pedido.");
      onSaved(Boolean(editingOrder));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="view-section new-order-view">
      <div className="welcome-row compact"><div><span className="eyebrow">{editingOrder ? "CORREÇÃO DE PEDIDO" : "VENDA NO BALCÃO"}</span><h1>{editingOrder ? `Editar #${editingOrder.orderNumber.slice(-5)}` : "Novo pedido"}</h1></div><span className="order-step">{showCheckout ? "2/2" : "1/2"}</span></div>
      {editingOrder && !showCheckout && <button className="text-button stop-editing" onClick={onStopEditing}>← Cancelar edição e voltar</button>}

      {!showCheckout ? <>
        <div className="category-tabs">
          {(["Todos", "Espetinhos", "Combos", "Bebidas", "Extras"] as const).map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {category !== "Extras" && <div className={`product-grid ${category === "Todos" ? "has-extras" : ""}`}>
          {filtered.map((product) => <ProductCard key={product.id} product={product} quantity={cart[product.id] || 0} change={change} />)}
        </div>}
        {(category === "Todos" || category === "Extras") && <section className="extras-panel">
          <div className="extras-heading"><div><span>VALOR LIVRE</span><h2>Adicionar extra</h2></div><b>＋</b></div>
          <p>Use para qualquer adicional que não esteja no cardápio. Informe o nome e o valor cobrado.</p>
          <div className="extra-form">
            <div className="field-group"><label htmlFor="extra-name">Nome do extra</label><input id="extra-name" value={extraName} onChange={(event) => setExtraName(event.target.value)} placeholder="Ex.: Farofa, molho ou pão" /></div>
            <div className="field-group"><label htmlFor="extra-price">Valor</label><input id="extra-price" type="text" inputMode="decimal" value={extraPrice} onChange={(event) => setExtraPrice(event.target.value)} placeholder="0,00" /></div>
            <button className="add-extra-button" onClick={addExtra}>Adicionar</button>
          </div>
          {extraError && <p className="error-message">{extraError}</p>}
          {selectedExtras.length > 0 && <div className="extra-list">
            {selectedExtras.map((extra) => <article key={extra.id}>
              <div><strong>{extra.name}</strong><span>{money.format(extra.price)} cada</span></div>
              <div className="extra-quantity"><button onClick={() => changeExtra(extra.id, -1)}>−</button><strong>{extra.quantity}</strong><button onClick={() => changeExtra(extra.id, 1)}>+</button></div>
              <strong>{money.format(extra.price * extra.quantity)}</strong>
            </article>)}
          </div>}
        </section>}
      </> : <div className="checkout-panel">
        <button className="text-button" onClick={() => setShowCheckout(false)}>← Voltar aos produtos</button>
        <div className="field-group"><label htmlFor="customer-name">Nome do cliente <small>(opcional)</small></label><input id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ex.: Mesa 3 ou nome do cliente" /></div>
        <div className="checkout-items">
          <div className="section-heading"><h2>Resumo do pedido</h2><span>{count} {count === 1 ? "item" : "itens"}</span></div>
          {selected.map((product) => <div className="checkout-line" key={product.id}><span>{cart[product.id]}× {product.name}</span><strong>{money.format(product.price * cart[product.id])}</strong></div>)}
          {selectedExtras.map((extra) => <div className="checkout-line" key={extra.id}><span>{extra.quantity}× {extra.name} <small>extra</small></span><strong>{money.format(extra.price * extra.quantity)}</strong></div>)}
          <div className="checkout-total"><span>Total</span><strong>{money.format(total)}</strong></div>
        </div>
        <div className="field-group"><label>Forma de pagamento</label><div className="payment-grid">{paymentMethods.map((method) => <button key={method} className={paymentMethod === method ? "active" : ""} onClick={() => setPaymentMethod(method)}>{method === "Pix" ? "◇" : method === "Dinheiro" ? "R$" : "▣"}<span>{method}</span></button>)}</div></div>
        {paymentMethod === "Dinheiro" && <div className="cash-row"><div className="field-group"><label htmlFor="amount-received">Valor recebido</label><input id="amount-received" type="number" inputMode="decimal" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} placeholder="0,00" /></div><div className="change-box"><span>Troco</span><strong>{money.format(changeDue)}</strong></div></div>}
        <div className="field-group"><label htmlFor="order-notes">Observações <small>(opcional)</small></label><textarea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: sem vinagrete, ponto da carne..." rows={3} /></div>
        {error && <p className="error-message">{error}</p>}
      </div>}

      <div className="sticky-cart">
        <div><span>{count} {count === 1 ? "item" : "itens"}</span><strong>{money.format(total)}</strong></div>
        {!showCheckout ? <button disabled={!count} onClick={() => setShowCheckout(true)}>{editingOrder ? "Revisar alterações →" : "Revisar pedido →"}</button> : <button disabled={saving || !count} onClick={saveOrder}>{saving ? "Salvando..." : editingOrder ? "Salvar alterações ✓" : "Finalizar pedido ✓"}</button>}
      </div>
    </section>
  );
}

function ReportsView({ orders, range, setRange }: { orders: Order[]; range: Range; setRange: (range: Range) => void }) {
  const valid = orders.filter((order) => order.status !== "cancelled");
  const revenue = valid.reduce((sum, order) => sum + order.total, 0);
  const average = valid.length ? revenue / valid.length : 0;
  const payments = paymentMethods.map((method) => ({ method, total: valid.filter((order) => order.paymentMethod === method).reduce((sum, order) => sum + order.total, 0) }));
  const productTotals = new Map<string, number>();
  valid.forEach((order) => order.items.forEach((item) => productTotals.set(item.productName, (productTotals.get(item.productName) || 0) + item.quantity)));
  const bestProducts = Array.from(productTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const from = startFor(range).toISOString();

  return (
    <section className="view-section reports-view">
      <div className="welcome-row"><div><span className="eyebrow">GESTÃO PHC</span><h1>Resultados</h1></div><a className="export-button" href={`/api/export?from=${encodeURIComponent(from)}`}>↓ Planilha</a></div>
      <div className="range-tabs">{(["today", "week", "month"] as Range[]).map((item) => <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item === "today" ? "Hoje" : item === "week" ? "Semana" : "Mês"}</button>)}</div>
      <article className="revenue-card"><span>Faturamento no período</span><strong>{money.format(revenue)}</strong><small>{valid.length} pedidos registrados</small><div className="spark-bars" aria-hidden="true">{[38, 52, 31, 66, 49, 83, 61, 94, 76, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></article>
      <div className="metric-grid"><article><span>Ticket médio</span><strong>{money.format(average)}</strong><small>por pedido</small></article><article><span>Itens vendidos</span><strong>{valid.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}</strong><small>no período</small></article></div>
      <article className="report-card"><div className="section-heading"><h2>Formas de pagamento</h2><span>Total</span></div>{payments.map((payment) => <div className="payment-row" key={payment.method}><span><i className={`payment-dot dot-${payment.method.toLowerCase()}`} />{payment.method}</span><strong>{money.format(payment.total)}</strong></div>)}</article>
      <article className="report-card"><div className="section-heading"><h2>Mais vendidos</h2><span>Unidades</span></div>{bestProducts.length ? bestProducts.map(([name, qty], index) => <div className="ranking-row" key={name}><b>{index + 1}</b><span>{name}</span><strong>{qty}</strong></div>) : <p className="muted">Os produtos mais vendidos aparecerão após os primeiros pedidos.</p>}</article>
    </section>
  );
}

function SettingsView({ attendant, setAttendant }: { attendant: string; setAttendant: (value: string) => void }) {
  return (
    <section className="view-section">
      <div className="welcome-row"><div><span className="eyebrow">CONFIGURAÇÃO</span><h1>Ajustes rápidos</h1></div></div>
      <article className="settings-card"><div className="settings-icon">👤</div><div><span>Aparelho identificado como</span><strong>{attendant}</strong></div><select value={attendant} onChange={(event) => setAttendant(event.target.value)}>{attendants.map((name) => <option key={name}>{name}</option>)}</select></article>
      <article className="settings-card"><div className="settings-icon">📋</div><div><span>Cardápio cadastrado</span><strong>{products.length} produtos ativos</strong></div><button>Ver</button></article>
      <article className="settings-card"><div className="settings-icon">☁️</div><div><span>Dados da operação</span><strong>Sincronização online</strong></div><i className="online-dot" /></article>
      <div className="info-card"><strong>Versão inicial da PHC Pedidos</strong><p>Os pedidos são compartilhados entre os aparelhos. A planilha pode ser baixada por dia, semana ou mês na área de relatórios.</p></div>
    </section>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("orders");
  const [attendant, setAttendant] = useState("Romualdo");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("today");
  const [notice, setNotice] = useState("");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async (selectedRange: Range = range) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders?from=${encodeURIComponent(startFor(selectedRange).toISOString())}`, { cache: "no-store" });
      const data = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch {
      setNotice("Não foi possível sincronizar agora. Tente atualizar em alguns segundos.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function changeCart(id: string, delta: number) {
    setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  }

  async function updateStatus(id: string, status: Status) {
    const response = await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error("Não foi possível atualizar o pedido.");
    await loadOrders();
  }

  async function cancelOrder(id: string, reason: string) {
    const response = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancelReason: reason, attendant }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error || "Não foi possível cancelar o pedido.");
    setNotice("Pedido cancelado e mantido no histórico.");
    await loadOrders("today");
  }

  async function deleteOrder(id: string) {
    const response = await fetch(`/api/orders/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true, attendant }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error || "Não foi possível excluir o pedido.");
    setNotice("Pedido excluído definitivamente.");
    await loadOrders("today");
  }

  function startEdit(order: Order) {
    setEditingOrder(order);
    const catalogIds = new Set(products.map((product) => product.id));
    setCart(Object.fromEntries(order.items.filter((item) => catalogIds.has(item.productId)).map((item) => [item.productId, item.quantity])));
    setTab("new");
  }

  function navigate(next: Tab) {
    if (next === "new") {
      setEditingOrder(null);
      setCart({});
    }
    setTab(next);
  }

  function saved(edited: boolean) {
    setCart({});
    setEditingOrder(null);
    setTab("orders");
    setNotice(edited ? "Pedido corrigido com sucesso!" : "Pedido registrado com sucesso!");
    loadOrders("today");
  }

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);

  function changeRange(next: Range) {
    setRange(next);
  }

  return (
    <main className="app-shell">
      <Header attendant={attendant} setAttendant={setAttendant} />
      <div className="app-content">
        {tab === "orders" && <OrdersView orders={orders} loading={loading} refresh={() => loadOrders("today")} updateStatus={updateStatus} onNew={() => navigate("new")} onEdit={startEdit} onCancel={cancelOrder} onDelete={deleteOrder} attendant={attendant} />}
        {tab === "new" && <NewOrderView cart={cart} change={changeCart} attendant={attendant} editingOrder={editingOrder} onSaved={saved} onStopEditing={() => { setEditingOrder(null); setCart({}); setTab("orders"); }} />}
        {tab === "reports" && <ReportsView orders={orders} range={range} setRange={changeRange} />}
        {tab === "settings" && <SettingsView attendant={attendant} setAttendant={setAttendant} />}
      </div>
      {notice && <div className="toast">{notice}</div>}
      <BottomNav tab={tab} setTab={navigate} cartCount={cartCount} />
    </main>
  );
}
