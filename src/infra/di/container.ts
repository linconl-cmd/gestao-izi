import type { SupabaseClient } from "@supabase/supabase-js";
import { CloseCashRegister } from "@/core/application/use-cases/cash-register/close-cash-register";
import { OpenCashRegister } from "@/core/application/use-cases/cash-register/open-cash-register";
import { CreateProduct } from "@/core/application/use-cases/catalog/create-product";
import { ScanProduct } from "@/core/application/use-cases/catalog/scan-product";
import { GetOwnerDashboard } from "@/core/application/use-cases/reports/get-owner-dashboard";
import { CancelOrder } from "@/core/application/use-cases/orders/cancel-order";
import { CreateOrder } from "@/core/application/use-cases/orders/create-order";
import { PayOrder } from "@/core/application/use-cases/orders/pay-order";
import { SetOrderItem } from "@/core/application/use-cases/orders/set-order-item";
import { CancelSale } from "@/core/application/use-cases/sales/cancel-sale";
import { RegisterSale } from "@/core/application/use-cases/sales/register-sale";
import { CreateStoreWithOwner } from "@/core/application/use-cases/stores/create-store-with-owner";
import { CreateManager } from "@/core/application/use-cases/users/create-manager";
import { CreateSeller } from "@/core/application/use-cases/users/create-seller";
import { SupabaseUserProvisioner } from "@/infra/services/auth-admin/supabase-user-provisioner";
import { SupabaseCashRegisterRepository } from "@/infra/supabase/repositories/supabase-cash-register-repository";
import { SupabaseCategoryRepository } from "@/infra/supabase/repositories/supabase-category-repository";
import { SupabaseCustomerRepository } from "@/infra/supabase/repositories/supabase-customer-repository";
import { SupabaseNotificationRepository } from "@/infra/supabase/repositories/supabase-notification-repository";
import { SupabaseOrderRepository } from "@/infra/supabase/repositories/supabase-order-repository";
import { SupabaseProductRepository } from "@/infra/supabase/repositories/supabase-product-repository";
import { SupabaseProfileRepository } from "@/infra/supabase/repositories/supabase-profile-repository";
import { SupabaseSaleRepository } from "@/infra/supabase/repositories/supabase-sale-repository";
import { SupabaseStoreRepository } from "@/infra/supabase/repositories/supabase-store-repository";
import { SupabaseSessionProvider } from "@/infra/supabase/session-provider";

/**
 * Composition root. `db` é o cliente do usuário (RLS ativo); `adminFactory` só é
 * invocado quando um use case de provisionamento roda.
 */
export function buildContainer(db: SupabaseClient, adminFactory: () => SupabaseClient) {
  const stores = new SupabaseStoreRepository(db);
  const profiles = new SupabaseProfileRepository(db);
  const categories = new SupabaseCategoryRepository(db);
  const products = new SupabaseProductRepository(db);
  const customers = new SupabaseCustomerRepository(db);
  const cashRegisters = new SupabaseCashRegisterRepository(db);
  const sales = new SupabaseSaleRepository(db);
  const orders = new SupabaseOrderRepository(db);
  const notifications = new SupabaseNotificationRepository(db);
  const provisioner = new SupabaseUserProvisioner(adminFactory);

  return {
    session: new SupabaseSessionProvider(db),
    repositories: { stores, profiles, categories, products, customers, cashRegisters, sales, orders, notifications },
    useCases: {
      registerSale: new RegisterSale(sales),
      createOrder: new CreateOrder(orders),
      payOrder: new PayOrder(orders, cashRegisters, sales),
      cancelOrder: new CancelOrder(orders),
      setOrderItem: new SetOrderItem(orders),
      cancelSale: new CancelSale(sales),
      scanProduct: new ScanProduct(products),
      createProduct: new CreateProduct(products),
      openCashRegister: new OpenCashRegister(cashRegisters),
      closeCashRegister: new CloseCashRegister(cashRegisters),
      getOwnerDashboard: new GetOwnerDashboard(sales, products, profiles),
      createSeller: new CreateSeller(provisioner),
      createManager: new CreateManager(provisioner),
      createStoreWithOwner: new CreateStoreWithOwner(stores, provisioner),
    },
  };
}

export type Container = ReturnType<typeof buildContainer>;
