import { prisma } from "@/lib/prisma";

export async function getSubscriptionConfig() {
  try {
    let config = await prisma.subscriptionConfig.findUnique({
      where: { id: "singleton_sub_config" }
    });

    if (!config) {
      config = await prisma.subscriptionConfig.create({
        data: {
          id: "singleton_sub_config",
          pricePro: 10000,
          pointsPro: 100,
          priceProPlus: 30000,
          pointsProPlus: 500,
          initialPoints: 10,
          dailyRefresh: 1,
          costFast: 1,
          costHybrid: 2,
        }
      });
    }

    return config;
  } catch (error) {
    console.error("Error fetching SubscriptionConfig:", error);
    // Fallback static jika terjadi kendala koneksi DB sementara
    return {
      id: "singleton_sub_config",
      pricePro: 10000,
      pointsPro: 100,
      priceProPlus: 30000,
      pointsProPlus: 500,
      initialPoints: 10,
      dailyRefresh: 1,
      costFast: 1,
      costHybrid: 2,
    };
  }
}
