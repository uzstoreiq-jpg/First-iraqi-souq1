import { 
  LayoutGrid, 
  Ghost, 
  CarFront, 
  Hammer, 
  Activity, 
  Armchair, 
  SunDim, 
  Fan, 
  Coffee, 
  Wand2,
  Scissors,
  Microwave,
  Tv,
  Cpu,
  PackageOpen
} from "lucide-react";

export function getCategoryIconComponent(categoryName: string, className: string = "w-8 h-8", strokeWidth: number = 1.25) {
  switch (categoryName) {
    case "العاب": return <Ghost className={className} strokeWidth={strokeWidth} />;
    case "ادوات السيارات": return <CarFront className={className} strokeWidth={strokeWidth} />;
    case "عدد وادوات": return <Hammer className={className} strokeWidth={strokeWidth} />;
    case "ادوات رياضية": return <Activity className={className} strokeWidth={strokeWidth} />;
    case "اثاث": return <Armchair className={className} strokeWidth={strokeWidth} />;
    case "انارة واضائة":
    case "انارة اضاءة": return <SunDim className={className} strokeWidth={strokeWidth} />;
    case "ادوات منزلية": return <Fan className={className} strokeWidth={strokeWidth} />;
    case "ادوات المطبخ":
    case "ادوات مطبخ": return <Coffee className={className} strokeWidth={strokeWidth} />;
    case "منتجات العناية": return <Wand2 className={className} strokeWidth={strokeWidth} />;
    case "اجهزة العناية": return <Scissors className={className} strokeWidth={strokeWidth} />;
    case "اجهزة المطبخ": return <Microwave className={className} strokeWidth={strokeWidth} />;
    case "اجهزة المنزل": return <Tv className={className} strokeWidth={strokeWidth} />;
    case "الكترونيات": return <Cpu className={className} strokeWidth={strokeWidth} />;
    case "الكل": return <LayoutGrid className={className} strokeWidth={strokeWidth} />;
    default: return <PackageOpen className={className} strokeWidth={strokeWidth} />;
  }
}
