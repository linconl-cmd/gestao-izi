/**
 * Teste de integração do schema + RLS contra o projeto Supabase de .env.local.
 *
 * Cria DUAS lojas de teste (slug "rls-test-*"), usuários e dados descartáveis,
 * exercita as policies/triggers com clientes autenticados de verdade e remove
 * tudo no final (também varre restos de execuções interrompidas).
 *
 * Rodar:  npm run test:rls
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PREFIX = "rls-test-";
const RUN = randomUUID().slice(0, 8);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SERVICE, opts);

interface Actor {
  id: string;
  email: string;
  db: SupabaseClient;
}

const state = {
  storeA: "",
  storeB: "",
  master: {} as Actor,
  ownerA: {} as Actor,
  sellerA: {} as Actor,
  sellerA2: {} as Actor,
  ownerB: {} as Actor,
  productA: "",
  variantA: "",
  productB: "",
  variantB: "",
  registerA: "",
  sale1: "",
  sale2: "",
};

const password = `Rls!${randomUUID()}`;
const createdUsers: string[] = [];

async function makeStore(tag: string): Promise<string> {
  const { data, error } = await admin
    .from("stores")
    .insert({ name: `RLS Test ${tag} ${RUN}`, slug: `${PREFIX}${RUN}-${tag}` })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function makeUser(
  tag: string,
  role: "master" | "owner" | "seller",
  storeId: string | null,
): Promise<Actor> {
  const email = `${PREFIX}${RUN}-${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, store_id: storeId },
    user_metadata: { full_name: `RLS ${tag}` },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  createdUsers.push(data.user.id);

  const db = createClient(URL, ANON, opts);
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, db };
}

async function stockOf(variantId: string): Promise<number> {
  const { data, error } = await admin.from("product_variants").select("stock_quantity").eq("id", variantId).single();
  if (error) throw error;
  return data.stock_quantity as number;
}

/** Remove tudo que pertence às lojas de teste, respeitando as FKs. */
async function purge(storeIds: string[], userIds: string[]): Promise<void> {
  const step = async (label: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await fn();
    if (error) console.warn(`[cleanup] ${label}: ${error.message}`);
  };
  if (storeIds.length > 0) {
    await step("sales", () => admin.from("sales").delete().in("store_id", storeIds)); // cascade sale_items
    await step("cash_registers", () => admin.from("cash_registers").delete().in("store_id", storeIds));
  }
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.warn(`[cleanup] user ${id}: ${error.message}`);
  }
  if (storeIds.length > 0) await step("stores", () => admin.from("stores").delete().in("id", storeIds));
}

async function sweepStale(): Promise<void> {
  const { data: stores } = await admin.from("stores").select("id").like("slug", `${PREFIX}%`);
  const storeIds = (stores ?? []).map((s) => s.id as string);
  const userIds: string[] = [];
  if (storeIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id").in("store_id", storeIds);
    userIds.push(...(profiles ?? []).map((p) => p.id as string));
  }
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of list?.users ?? []) {
    if (u.email?.startsWith(PREFIX) && !userIds.includes(u.id)) userIds.push(u.id);
  }
  if (storeIds.length || userIds.length) await purge(storeIds, userIds);
}

beforeAll(async () => {
  expect(URL && ANON && SERVICE, "env vars do Supabase ausentes").toBeTruthy();
  await sweepStale();

  state.storeA = await makeStore("a");
  state.storeB = await makeStore("b");
  state.master = await makeUser("master", "master", null);
  state.ownerA = await makeUser("owner-a", "owner", state.storeA);
  state.sellerA = await makeUser("seller-a", "seller", state.storeA);
  state.sellerA2 = await makeUser("seller-a2", "seller", state.storeA);
  state.ownerB = await makeUser("owner-b", "owner", state.storeB);

  // Catálogo semeado via service role (bypassa RLS).
  for (const [key, storeId, price] of [
    ["A", state.storeA, 50],
    ["B", state.storeB, 70],
  ] as const) {
    const { data: p, error: pe } = await admin
      .from("products")
      .insert({ store_id: storeId, name: `Camiseta ${key}`, base_price: price })
      .select("id")
      .single();
    if (pe) throw pe;
    const { data: v, error: ve } = await admin
      .from("product_variants")
      .insert({ store_id: storeId, product_id: p.id, size: "M", color: "Azul", sku: `SKU-${RUN}-${key}`, barcode: `789${RUN}${key}`, stock_quantity: 10 })
      .select("id")
      .single();
    if (ve) throw ve;
    await admin.from("product_costs").insert({ store_id: storeId, product_id: p.id, cost_price: 20 });
    if (key === "A") {
      state.productA = p.id;
      state.variantA = v.id;
    } else {
      state.productB = p.id;
      state.variantB = v.id;
    }
  }
}, 120_000);

afterAll(async () => {
  await purge([state.storeA, state.storeB].filter(Boolean), createdUsers);
  const { data } = await admin.from("stores").select("id").like("slug", `${PREFIX}${RUN}%`);
  expect(data ?? [], "restaram lojas de teste").toHaveLength(0);
}, 120_000);

describe("claims e perfis", () => {
  it("trigger cria profile e o JWT carrega role/store_id", async () => {
    const { data } = await state.sellerA.db.auth.getUser();
    expect(data.user?.app_metadata).toMatchObject({ role: "seller", store_id: state.storeA });
    const { data: profile } = await state.sellerA.db.from("profiles").select("*").eq("id", state.sellerA.id).single();
    expect(profile).toMatchObject({ role: "seller", store_id: state.storeA, is_active: true });
  });

  it("usuário não consegue escalar o próprio role nem trocar de loja", async () => {
    for (const patch of [{ role: "master" }, { store_id: state.storeB }]) {
      const { error } = await state.sellerA.db.from("profiles").update(patch).eq("id", state.sellerA.id);
      expect(error?.code).toBe("42501");
    }
    const { error } = await state.ownerA.db.from("profiles").update({ role: "master" }).eq("id", state.ownerA.id);
    expect(error?.code).toBe("42501");
  });

  it("owner não desativa a si mesmo, mas desativa vendedor da própria loja", async () => {
    const { error } = await state.ownerA.db.from("profiles").update({ is_active: false }).eq("id", state.ownerA.id);
    expect(error?.code).toBe("42501");

    const { data } = await state.ownerA.db.from("profiles").update({ is_active: false }).eq("id", state.sellerA2.id).select();
    expect(data).toHaveLength(1);
    await admin.from("profiles").update({ is_active: true }).eq("id", state.sellerA2.id);
  });

  it("owner não altera vendedor de outra loja nem vê perfis de outra loja", async () => {
    const { data } = await state.ownerB.db.from("profiles").update({ full_name: "x" }).eq("id", state.sellerA.id).select();
    expect(data).toHaveLength(0);
    const { data: seen } = await state.ownerB.db.from("profiles").select("id").eq("id", state.sellerA.id);
    expect(seen).toHaveLength(0);
  });
});

describe("isolamento multi-tenant", () => {
  it("anônimo não lê nada", async () => {
    const anon = createClient(URL, ANON, opts);
    for (const table of ["stores", "products", "product_variants", "sales", "profiles"]) {
      const { data } = await anon.from(table).select("id").limit(1);
      expect(data ?? [], table).toHaveLength(0);
    }
  });

  it("vendedor e owner só enxergam produtos da própria loja", async () => {
    for (const actor of [state.sellerA, state.ownerA]) {
      const { data } = await actor.db.from("products").select("id");
      expect(data?.map((p) => p.id)).toEqual([state.productA]);
    }
    const { data } = await state.ownerB.db.from("product_variants").select("id");
    expect(data?.map((v) => v.id)).toEqual([state.variantB]);
  });

  it("não é possível gravar em outra loja", async () => {
    const { error } = await state.ownerA.db
      .from("products")
      .insert({ store_id: state.storeB, name: "intruso", base_price: 1 });
    expect(error?.code).toBe("42501");

    const { error: custErr } = await state.sellerA.db
      .from("customers")
      .insert({ store_id: state.storeB, name: "intruso" });
    expect(custErr?.code).toBe("42501");
  });

  it("master lê todas as lojas, mas não grava dados de loja", async () => {
    const { data } = await state.master.db.from("products").select("id").in("id", [state.productA, state.productB]);
    expect(data).toHaveLength(2);
    const { data: stores } = await state.master.db.from("stores").select("id").in("id", [state.storeA, state.storeB]);
    expect(stores).toHaveLength(2);
    const { error } = await state.master.db.from("products").insert({ store_id: state.storeA, name: "x", base_price: 1 });
    expect(error?.code).toBe("42501");
  });

  it("owner não desativa a própria loja nem muda o slug", async () => {
    const { error } = await state.ownerA.db.from("stores").update({ is_active: false }).eq("id", state.storeA);
    expect(error?.code).toBe("42501");
    const { data } = await state.ownerA.db.from("stores").update({ phone: "1199999" }).eq("id", state.storeA).select();
    expect(data).toHaveLength(1);
  });
});

describe("restrições do vendedor", () => {
  it("não vê custo", async () => {
    const { data } = await state.sellerA.db.from("product_costs").select("*");
    expect(data).toHaveLength(0);
    const { data: owner } = await state.ownerA.db.from("product_costs").select("*");
    expect(owner).toHaveLength(1);
  });

  it("não altera nem apaga catálogo", async () => {
    const { error } = await state.sellerA.db.from("products").insert({ store_id: state.storeA, name: "x", base_price: 1 });
    expect(error?.code).toBe("42501");

    const upd = await state.sellerA.db.from("product_variants").update({ stock_quantity: 999 }).eq("id", state.variantA).select();
    expect(upd.data).toHaveLength(0);
    const del = await state.sellerA.db.from("products").delete().eq("id", state.productA).select();
    expect(del.data).toHaveLength(0);
    expect(await stockOf(state.variantA)).toBe(10);
  });

  it("vendedor não vê variante inativa", async () => {
    await admin.from("product_variants").update({ is_active: false }).eq("id", state.variantA);
    const { data } = await state.sellerA.db.from("product_variants").select("id").eq("id", state.variantA);
    expect(data).toHaveLength(0);
    await admin.from("product_variants").update({ is_active: true }).eq("id", state.variantA);
  });

  it("cria cliente na própria loja, mas não edita", async () => {
    const { data, error } = await state.sellerA.db
      .from("customers")
      .insert({ store_id: state.storeA, name: "Cliente Teste" })
      .select("id")
      .single();
    expect(error).toBeNull();
    const upd = await state.sellerA.db.from("customers").update({ name: "y" }).eq("id", data!.id).select();
    expect(upd.data).toHaveLength(0);
  });
});

describe("caixa, vendas e estoque", () => {
  it("não vende sem caixa aberto", async () => {
    const { error } = await state.sellerA.db.rpc("create_sale", {
      p_cash_register_id: randomUUID(),
      p_payment_method: "cash",
      p_items: [{ variant_id: state.variantA, quantity: 1 }],
    });
    expect(error).not.toBeNull();
    expect(await stockOf(state.variantA)).toBe(10);
  });

  it("abre caixa; segundo caixa aberto é recusado; não abre caixa em nome de outro", async () => {
    const { data, error } = await state.sellerA.db
      .from("cash_registers")
      .insert({ store_id: state.storeA, opened_by: state.sellerA.id, opening_amount: 20 })
      .select("id")
      .single();
    expect(error).toBeNull();
    state.registerA = data!.id;

    const dup = await state.sellerA.db
      .from("cash_registers")
      .insert({ store_id: state.storeA, opened_by: state.sellerA.id, opening_amount: 0 });
    expect(dup.error?.code).toBe("23505");

    const spoof = await state.sellerA.db
      .from("cash_registers")
      .insert({ store_id: state.storeA, opened_by: state.sellerA2.id, opening_amount: 0 });
    expect(spoof.error?.code).toBe("42501");
  });

  it("outro vendedor não usa o caixa alheio", async () => {
    const { error } = await state.sellerA2.db.rpc("create_sale", {
      p_cash_register_id: state.registerA,
      p_payment_method: "cash",
      p_items: [{ variant_id: state.variantA, quantity: 1 }],
    });
    expect(error).not.toBeNull();
    expect(await stockOf(state.variantA)).toBe(10);
  });

  it("create_sale: preço vem do catálogo, total calculado e estoque baixado", async () => {
    const { data, error } = await state.sellerA.db.rpc("create_sale", {
      p_cash_register_id: state.registerA,
      p_payment_method: "cash",
      p_items: [{ variant_id: state.variantA, quantity: 2, discount: 0 }],
      p_discount: 10,
    });
    expect(error).toBeNull();
    state.sale1 = data as string;

    const { data: sale } = await admin.from("sales").select("*, sale_items(*)").eq("id", state.sale1).single();
    expect(Number(sale.subtotal)).toBe(100);
    expect(Number(sale.total)).toBe(90);
    expect(sale.seller_id).toBe(state.sellerA.id);
    expect(sale.sale_items[0]).toMatchObject({ quantity: 2, product_name: "Camiseta A", variant_label: "M / Azul" });
    expect(Number(sale.sale_items[0].unit_price)).toBe(50);
    expect(await stockOf(state.variantA)).toBe(8);
  });

  it("estoque insuficiente aborta a venda inteira", async () => {
    const { error } = await state.sellerA.db.rpc("create_sale", {
      p_cash_register_id: state.registerA,
      p_payment_method: "pix",
      p_items: [{ variant_id: state.variantA, quantity: 99 }],
    });
    expect(error?.message).toMatch(/insufficient stock/i);
    expect(await stockOf(state.variantA)).toBe(8);
    const { count } = await admin.from("sales").select("id", { count: "exact", head: true }).eq("store_id", state.storeA);
    expect(count).toBe(1);
  });

  it("não vende produto de outra loja", async () => {
    const { error } = await state.sellerA.db.rpc("create_sale", {
      p_cash_register_id: state.registerA,
      p_payment_method: "pix",
      p_items: [{ variant_id: state.variantB, quantity: 1 }],
    });
    expect(error).not.toBeNull();
    expect(await stockOf(state.variantB)).toBe(10);
  });

  it("não insere itens fora do create_sale nem forja preço", async () => {
    const forged = await state.sellerA.db
      .from("sale_items")
      .insert({ store_id: state.storeA, sale_id: state.sale1, variant_id: state.variantA, quantity: 1, discount: 0 });
    expect(forged.error).not.toBeNull();
    expect(await stockOf(state.variantA)).toBe(8);

    const direct = await state.sellerA.db.from("sales").insert({
      store_id: state.storeA, seller_id: state.sellerA.id, cash_register_id: state.registerA,
      payment_method: "cash", total: 1,
    }).select("*").single();
    // Se o insert direto passar, o trigger zera os totais (sem itens, total = 0).
    if (direct.data) {
      expect(Number(direct.data.total)).toBe(0);
      await admin.from("sales").delete().eq("id", direct.data.id);
    }
  });

  it("visibilidade das vendas", async () => {
    const ids = async (actor: Actor) =>
      ((await actor.db.from("sales").select("id").eq("id", state.sale1)).data ?? []).length;
    expect(await ids(state.sellerA)).toBe(1);
    expect(await ids(state.ownerA)).toBe(1);
    expect(await ids(state.master)).toBe(1);
    expect(await ids(state.sellerA2)).toBe(0);
    expect(await ids(state.ownerB)).toBe(0);

    const items = await state.sellerA2.db.from("sale_items").select("id").eq("sale_id", state.sale1);
    expect(items.data).toHaveLength(0);
  });

  it("vendedor não cancela, edita nem apaga venda", async () => {
    const cancel = await state.sellerA.db.from("sales").update({ status: "cancelled" }).eq("id", state.sale1).select();
    expect(cancel.data).toHaveLength(0);
    // DELETE nem é concedido a authenticated: erro de permissão (ou zero linhas).
    const del = await state.sellerA.db.from("sales").delete().eq("id", state.sale1).select();
    expect(del.error !== null || del.data?.length === 0).toBe(true);
    const { data: still } = await admin.from("sales").select("id").eq("id", state.sale1);
    expect(still).toHaveLength(1);
    expect(await stockOf(state.variantA)).toBe(8);
  });

  it("owner não altera dados financeiros, mas cancela e estorna estoque", async () => {
    const tamper = await state.ownerA.db.from("sales").update({ total: 1 }).eq("id", state.sale1);
    expect(tamper.error).not.toBeNull();

    const { data, error } = await state.ownerA.db.from("sales").update({ status: "cancelled" }).eq("id", state.sale1).select().single();
    expect(error).toBeNull();
    expect(data!.cancelled_by).toBe(state.ownerA.id);
    expect(await stockOf(state.variantA)).toBe(10);

    const reopen = await state.ownerA.db.from("sales").update({ status: "completed" }).eq("id", state.sale1);
    expect(reopen.error).not.toBeNull();
    expect(await stockOf(state.variantA)).toBe(10);
  });

  it("owner de outra loja não cancela venda alheia", async () => {
    const { data } = await state.ownerB.db.from("sales").update({ status: "cancelled" }).eq("id", state.sale1).select();
    expect(data).toHaveLength(0);
  });

  it("fechamento: esperado = abertura + vendas em dinheiro não canceladas", async () => {
    const { data, error } = await state.sellerA.db.rpc("create_sale", {
      p_cash_register_id: state.registerA,
      p_payment_method: "cash",
      p_items: [{ variant_id: state.variantA, quantity: 1 }],
    });
    expect(error).toBeNull();
    state.sale2 = data as string;

    const closed = await state.sellerA.db
      .from("cash_registers")
      .update({ status: "closed", closing_amount: 70 })
      .eq("id", state.registerA)
      .select()
      .single();
    expect(closed.error).toBeNull();
    expect(Number(closed.data!.expected_amount)).toBe(70); // 20 + 50 (a venda de 90 foi cancelada)
    expect(closed.data!.closed_by).toBe(state.sellerA.id);

    const again = await state.sellerA.db.from("cash_registers").update({ closing_amount: 1 }).eq("id", state.registerA).select();
    expect(again.data).toHaveLength(0);

    const late = await state.sellerA.db.rpc("create_sale", {
      p_cash_register_id: state.registerA,
      p_payment_method: "cash",
      p_items: [{ variant_id: state.variantA, quantity: 1 }],
    });
    expect(late.error).not.toBeNull();
  });
});
