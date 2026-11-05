import type { components } from './schema';

type Schemas = components['schemas'];

export type User = Schemas['User'];
export type Role = User['role'];
export type Category = Schemas['Category'];
export type ProductImage = Schemas['Image'];
export type PublicProduct = Schemas['PublicProduct'];
export type PublicProductPage = Schemas['PublicProductPage'];
export type StoreInfo = Schemas['StoreSettings'];
export type Cart = Schemas['Cart'];
export type CartLine = Cart['items'][number];
export type Address = Schemas['Address'];
export type Order = Schemas['Order'];
export type OrderStatus = Order['status'];
export type Fulfillment = Order['fulfillment'];
export type PaymentStatus = NonNullable<Order['payment']>['status'];
export type OrderPage = Schemas['OrderPage'];
export type PaymentLink = Schemas['PaymentLink'];
export type AdminProduct = Schemas['AdminProduct'];
export type AdminProductPage = Schemas['AdminProductPage'];
export type AdminCategory = Schemas['AdminCategoryList']['items'][number];
export type StockMovement = Schemas['StockMovementList']['items'][number];
export type AdminOrder = Schemas['AdminOrder'];
export type AdminOrderPage = Schemas['AdminOrderPage'];
export type Stats = Schemas['Stats'];
export type ApiErrorBody = Schemas['Error'];

/** Fields a customer sends to create or edit an address. */
export type AddressInput = Omit<Address, 'id' | 'createdAt'>;
