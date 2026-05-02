import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ServiceType, Wall, Room, RegionPricing, ServiceCalculation } from "@/types";
import { getServiceInfo } from "@/utils/serviceData";
import { calculateRoomTotalArea, calculateTotalPrice, formatNumber, formatCurrency } from "@/utils/calculationUtils";

import calculateForUser from "@/utils/calculationEngine";

import { getCountries, getRegionsByCountry } from "@/utils/regionData";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { Plus, Trash2, ChevronRight, ChevronLeft, MapPin } from "lucide-react";

interface ServiceCalculatorProps {
  serviceType: ServiceType;
  onAddService: (calculation: ServiceCalculation) => void;
  onCancel: () => void;
}

type Step = "region" | "rooms" | "review";

interface RoomDraft {
  id: string;
  name: string;
  walls: WallDraft[];
}

interface WallDraft {
  id: string;
  width: string;
  height: string;
}

const ServiceCalculator = ({ serviceType, onAddService, onCancel }: ServiceCalculatorProps) => {
  const { toast } = useToast();

  const serviceInfo = getServiceInfo(serviceType);
  const Icon = serviceInfo.icon;

  const [step, setStep] = useState<Step>("region");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<RegionPricing | null>(null);

  // 🔥 NOVO: modo pladur sem quebrar resto do sistema
  const [pladurMode, setPladurMode] = useState<"parede" | "teto">("parede");

  const [roomDrafts, setRoomDrafts] = useState<RoomDraft[]>([
    {
      id: uuidv4(),
      name: "Cômodo 1",
      walls: [{ id: uuidv4(), width: "", height: "" }]
    }
  ]);

  const countries = getCountries();

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedRegion(null);
  };

  const handleRegionChange = (regionLabel: string) => {
    const regions = getRegionsByCountry(selectedCountry);
    const found = regions.find(r => r.region === regionLabel);
    if (found) setSelectedRegion(found);
  };

  /**
   * =========================================
   * ROOMS
   * =========================================
   */
  const addRoom = () => {
    setRoomDrafts(prev => [
      ...prev,
      {
        id: uuidv4(),
        name: `Cômodo ${prev.length + 1}`,
        walls: [{ id: uuidv4(), width: "", height: "" }]
      }
    ]);
  };

  const removeRoom = (id: string) => {
    if (roomDrafts.length <= 1) return;
    setRoomDrafts(prev => prev.filter(r => r.id !== id));
  };

  const updateRoomName = (id: string, name: string) => {
    setRoomDrafts(prev =>
      prev.map(r => r.id === id ? { ...r, name } : r)
    );
  };

  /**
   * =========================================
   * WALLS
   * =========================================
   */
  const addWall = (roomId: string) => {
    setRoomDrafts(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, walls: [...r.walls, { id: uuidv4(), width: "", height: "" }] }
          : r
      )
    );
  };

  const removeWall = (roomId: string, wallId: string) => {
    setRoomDrafts(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        if (r.walls.length <= 1) return r;
        return { ...r, walls: r.walls.filter(w => w.id !== wallId) };
      })
    );
  };

  const updateWall = (
    roomId: string,
    wallId: string,
    field: "width" | "height",
    value: string
  ) => {
    setRoomDrafts(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          walls: r.walls.map(w =>
            w.id === wallId ? { ...w, [field]: value } : w
          )
        };
      })
    );
  };

  const isPiso = serviceType === "piso";

  /**
   * =========================================
   * VALIDATION
   * =========================================
   */
  const validateRooms = () => {
    for (const room of roomDrafts) {
      for (const wall of room.walls) {
        const w = parseFloat(wall.width);
        const h = parseFloat(wall.height);

        if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
          toast({
            title: "Erro",
            description: `Preencha corretamente ${room.name}`,
            variant: "destructive"
          });
          return false;
        }
      }
    }
    return true;
  };

  /**
   * =========================================
   * BUILD CALCULATION (CORRIGIDO)
   * =========================================
   */
  const buildCalculation = (): ServiceCalculation | null => {
    if (!selectedRegion) return null;

    const rooms: Room[] = roomDrafts.map(room => {
      const walls: Wall[] = room.walls.map(w => {
        const width = parseFloat(w.width);
        const height = parseFloat(w.height);

        return {
          id: w.id,
          width,
          height,
          area: width * height
        };
      });

      const totalArea = calculateRoomTotalArea(walls);

      // 🔥 ENGINE CORRETO (sem quebrar sistema)
      const result = calculateForUser(
        serviceType,
        totalArea,
        selectedRegion,
        serviceType === "pladur" ? pladurMode : undefined
      );

      const materials = result.materials.map(m => ({
        name: m.material,
        quantity: m.valor_tecnico,
        unit: m.tecnico,
        pricePerUnit: m.pricePerUnit,
      }));

      return {
        id: room.id,
        name: room.name,
        walls,
        totalArea,
        materials,
        totalPrice: calculateTotalPrice(materials)
      };
    });

    const totalArea = rooms.reduce((sum, r) => sum + r.totalArea, 0);

    const final = calculateForUser(
      serviceType,
      totalArea,
      selectedRegion,
      serviceType === "pladur" ? pladurMode : undefined
    );

    return {
      id: uuidv4(),
      type: serviceType,
      rooms,
      totalArea,
      materials: final.materials,
      totalPrice: calculateTotalPrice(final.materials),
      regionPricing: selectedRegion,
      width: 0,
      height: 0,
      area: totalArea
    };
  };

  const handleNextToRooms = () => {
    if (!selectedRegion) {
      toast({
        title: "Selecione região",
        description: "Escolha país e região",
        variant: "destructive"
      });
      return;
    }
    setStep("rooms");
  };

  const handleNextToReview = () => {
    if (!validateRooms()) return;
    setStep("review");
  };

  const handleSubmit = () => {
    const calc = buildCalculation();
    if (calc) onAddService(calc);
  };

  const calculation = step === "review" ? buildCalculation() : null;

  return (
    <Card className="w-full max-w-2xl mx-auto">

      <CardHeader className={cn("flex flex-row items-center gap-4", serviceInfo.backgroundColor)}>
        <div className="bg-white p-2 rounded-full">
          <Icon size={24} />
        </div>
        <CardTitle>{serviceInfo.name}</CardTitle>
      </CardHeader>

      <CardContent className="pt-6">

        {/* 🔥 PLADUR MODE */}
        {serviceType === "pladur" && (
          <div className="mb-4 space-y-2">
            <Label>Tipo de Pladur</Label>
            <Select value={pladurMode} onValueChange={(v: "parede" | "teto") => setPladurMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parede">Parede</SelectItem>
                <SelectItem value="teto">Teto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* REGION (NÃO ALTERADO) */}
        {step === "region" && (
          <div className="space-y-4">
            <Label>País</Label>

            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger />
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCountry && (
              <Select value={selectedRegion?.region ?? ""} onValueChange={handleRegionChange}>
                <SelectTrigger />
                <SelectContent>
                  {getRegionsByCountry(selectedCountry).map(r => (
                    <SelectItem key={r.region} value={r.region}>
                      {r.region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* ROOMS (igual ao teu original funcional) */}
        {step === "rooms" && (
          <div className="space-y-4">
            {roomDrafts.map(room => (
              <div key={room.id} className="border p-3 rounded-lg">
                <Input
                  value={room.name}
                  onChange={(e) => updateRoomName(room.id, e.target.value)}
                />

                {room.walls.map(w => (
                  <div key={w.id} className="flex gap-2 mt-2">
                    <Input
                      placeholder="Largura"
                      value={w.width}
                      onChange={(e) => updateWall(room.id, w.id, "width", e.target.value)}
                    />
                    <Input
                      placeholder="Altura"
                      value={w.height}
                      onChange={(e) => updateWall(room.id, w.id, "height", e.target.value)}
                    />
                  </div>
                ))}

                <Button onClick={() => addWall(room.id)}>
                  Adicionar parede
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* REVIEW */}
        {step === "review" && calculation && (
          <div>
            <p>Área total: {formatNumber(calculation.totalArea)} m²</p>
            <p>
              {formatCurrency(
                calculation.totalPrice,
                selectedRegion?.currency,
                selectedRegion?.locale
              )}
            </p>
          </div>
        )}

      </CardContent>

      <CardFooter className="flex justify-between">
        {step === "region" && (
          <>
            <Button onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleNextToRooms}>Próximo</Button>
          </>
        )}

        {step === "rooms" && (
          <>
            <Button onClick={() => setStep("region")}>Voltar</Button>
            <Button onClick={handleNextToReview}>Revisar</Button>
          </>
        )}

        {step === "review" && (
          <>
            <Button onClick={() => setStep("rooms")}>Voltar</Button>
            <Button onClick={handleSubmit}>Adicionar</Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default ServiceCalculator;
