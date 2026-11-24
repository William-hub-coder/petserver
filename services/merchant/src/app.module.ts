import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CartService } from './cart.service';
import { ShopOrderService } from './shop-order.service';
import { ProductReviewController } from './product-review.controller';
import { ProductReviewService } from './product-review.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogService } from './service-catalog.service';
import { AmapClient } from './amap.client';
import { GeoController } from './geo.controller';
import { LocationTrackService } from './location-track.service';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { HomeVisitLiveService } from './home-visit-live.service';
import { PetListingController } from './pet-listing.controller';
import { PetListingService } from './pet-listing.service';

@Module({
  controllers: [
    HealthController,
    MerchantController,
    BookingController,
    ReviewController,
    ProductReviewController,
    ProductController,
    ServiceCatalogController,
    GeoController,
    DeliveryController,
    PetListingController,
  ],
  providers: [
    MerchantService,
    BookingService,
    ReviewService,
    ProductService,
    CartService,
    ShopOrderService,
    ProductReviewService,
    ServiceCatalogService,
    AmapClient,
    LocationTrackService,
    DeliveryService,
    HomeVisitLiveService,
    PetListingService,
  ],
})
export class AppModule {}
