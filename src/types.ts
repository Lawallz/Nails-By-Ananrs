export interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  description: string;
  image: string;
  category: "manicure" | "pedicure" | "alongamento" | "outros";
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface AIStylistRecommendation {
  recommendedServiceId: string;
  explanation: string;
  artStyleSuggestion: string;
  colorPalette: string[];
}
