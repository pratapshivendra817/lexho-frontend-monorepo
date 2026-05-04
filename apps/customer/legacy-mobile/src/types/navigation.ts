export type AuthStackParamList = {
  Login: undefined;
  OTP: { mobile: string };
};

export type AppTabParamList = {
  Home: undefined;
  Orders: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Categories: undefined;
  ServiceList: { categoryId: string; categoryName: string };
  ServiceDetails: { serviceId: string };
  ServiceDetail: { serviceId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string };
  OrderDetails: { orderId: string };
  Reviews: undefined;
  Dashboard: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
};
