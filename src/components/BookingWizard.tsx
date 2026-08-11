import React, { useState, useEffect, useMemo } from "react";
import { Clock, Calendar as CalendarIcon, User, Phone, CheckCircle2, ArrowRight, ArrowLeft, Send } from "lucide-react";
import emailjs from "@emailjs/browser";
import { Service, Booking } from "../types";
import { supabase } from "../lib/supabase"; // Importação do Supabase

interface BookingWizardProps {
  preselectedService: Service | null;
  onClearPreselectedService: () => void;
  onBookingSuccess: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({ 
  preselectedService, 
  onClearPreselectedService,
  onBookingSuccess 
}) => {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  
  // Lista dinâmica de serviços vinda do Supabase (Admin)
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Busca os serviços direto do Supabase
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      const { data, error } = await supabase.from('services').select('*');
      if (error) {
        console.error("Erro ao buscar serviços do Supabase:", error);
      } else if (data) {
        setServices(data as Service[]);
      }
      setLoadingServices(false);
    };

    fetchServices();
  }, []);

  // Carrega agendamentos reais do Supabase para validação global de conflitos
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase.from('bookings').select('*');
        if (error) {
          console.error("Erro ao buscar agendamentos do Supabase:", error);
          return;
        }
        
        const formatted: Booking[] = (data || []).map((item: any) => ({
          id: item.id,
          serviceId: item.service_id,
          serviceName: item.service_name,
          price: item.price,
          date: item.date,
          time: item.time,
          clientName: item.client_name,
          clientPhone: item.client_phone,
          createdAt: item.created_at
        }));

        setExistingBookings(formatted);
      } catch (err) {
        console.error("Erro de conexão com o Supabase:", err);
      }
    };

    fetchBookings();
  }, [step]);

  // Se um serviço pré-selecionado vier de fora, avança pro Passo 2
  useEffect(() => {
    if (preselectedService) {
      setSelectedService(preselectedService);
      setStep(2);
    }
  }, [preselectedService]);

  const baseTimeslots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  const timeToMinutes = (timeStr: string): number => {
    const [hrs, mins] = timeStr.split(":").map(Number);
    return hrs * 60 + mins;
  };

  const parseDuration = (durationStr: string): number => {
    if (!durationStr) return 60;
    if (durationStr.includes(":")) {
      return timeToMinutes(durationStr);
    }
    const matched = durationStr.match(/\d+/);
    return matched ? parseInt(matched[0], 10) : 60;
  };

  const validatedTimeslots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];

    const bookingsToday = existingBookings.filter(b => b.date === selectedDate);
    const serviceDuration = parseDuration(selectedService.duration);

    return baseTimeslots.map(time => {
      const currentStart = timeToMinutes(time);
      const currentEnd = currentStart + serviceDuration;

      const isOccupied = bookingsToday.some(booking => {
        const bookedService = services.find(s => s.id === booking.serviceId || s.name === booking.serviceName);
        const bookedDuration = bookedService ? parseDuration(bookedService.duration) : 60;
        
        const bookedStart = timeToMinutes(booking.time);
        const bookedEnd = bookedStart + bookedDuration;

        return currentStart < bookedEnd && currentEnd > bookedStart;
      });

      return {
        time,
        disabled: isOccupied
      };
    });
  }, [selectedDate, selectedService, existingBookings, services]);

  const calendarDays = useMemo(() => {
    const list = [];
    const dateObj = new Date();
    for (let i = 1; i <= 12; i++) {
      const future = new Date();
      future.setDate(dateObj.getDate() + i);
      
      const dayName = future.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const dayNum = future.getDate();
      const monthName = future.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const fullIso = future.toISOString().split("T")[0];

      list.push({
        id: fullIso,
        weekday: dayName,
        number: dayNum,
        month: monthName,
        formatted: future.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })
      });
    }
    return list;
  }, []);

  const handleNextStep = () => {
    if (step === 1 && selectedService) {
      setStep(2);
    } else if (step === 2 && selectedDate && selectedTime) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      if (preselectedService) {
        onClearPreselectedService();
      }
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) return;

    const newBooking: Booking = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate,
      time: selectedTime,
      clientName,
      clientPhone,
      createdAt: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('bookings').insert([
        {
          id: newBooking.id,
          service_id: newBooking.serviceId,
          service_name: newBooking.serviceName,
          price: newBooking.price,
          date: newBooking.date,
          time: newBooking.time,
          client_name: newBooking.clientName,
          client_phone: newBooking.clientPhone
        }
      ]);

      if (error) {
        console.error("Erro ao inserir no Supabase:", error);
        alert("Ops! Este horário acabou de ser ocupado por outra cliente. Escolha outro horário.");
        return;
      }
    } catch (err) {
      console.error("Erro de conexão ao salvar:", err);
      return;
    }

    const dateMeta = calendarDays.find(d => d.id === selectedDate);
    const readableDate = dateMeta ? `${dateMeta.number} de ${dateMeta.month}` : selectedDate;

    const templateParams = {
      client_name: clientName,
      client_phone: clientPhone,
      service_name: selectedService.name,
      booking_date: readableDate,
      booking_time: selectedTime,
      booking_id: newBooking.id
    };

    emailjs.send(
      "service_tlnez6o",
      "template_pbx0qys",
      templateParams,
      "7RvvuR5w-kfUKwH-8"
    ).catch((err) => console.error("Falha ao enviar e-mail:", err));

    setConfirmedBooking(newBooking);
    setStep(4);
    onBookingSuccess();
  };

  const getWhatsAppLink = (booking: Booking | null) => {
    if (!booking) return "";
    const dateMeta = calendarDays.find(d => d.id === booking.date);
    const readableDate = dateMeta ? `${dateMeta.number} de ${dateMeta.month}` : booking.date;

    const text = `Olá Ana! Gostaria de confirmar meu agendamento de unhas:
    
✨ *Serviço:* ${booking.serviceName}
📅 *Data:* ${readableDate}
⏰ *Horário:* ${booking.time}
👤 *Cliente:* ${booking.clientName}
📞 *Telefone:* ${booking.clientPhone}
🎫 *Código:* #${booking.id}
    
Aguardo a confirmação da agenda! Obrigada.`;

    return `https://wa.me/5511917670355?text=${encodeURIComponent(text)}`;
  };

  const getFormattedDate = (isoString: string) => {
    const matched = calendarDays.find(d => d.id === isoString);
    return matched ? `${matched.number} de ${matched.month}` : isoString;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 text-left" id="booking-wizard-container">
      
      {/* 1. Progress Step Bar Indicators */}
      <div className="border-b border-zinc-900 pb-6" id="wizard-step-indicator">
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-zinc-500 uppercase select-none">
          <span className={step >= 1 ? "text-[#dec0b3]" : ""}>Passo 01: Procedimento</span>
          <span className="text-zinc-800">→</span>
          <span className={step >= 2 ? "text-[#dec0b3]" : ""}>Passo 02: Data e Hora</span>
          <span className="text-zinc-800">→</span>
          <span className={step >= 3 ? "text-[#dec0b3]" : ""}>Passo 03: Confirmar</span>
        </div>
        <div className="h-1 bg-zinc-950 rounded-full mt-4 relative overflow-hidden">
          <div 
            className="absolute left-0 top-0 bottom-0 bg-[#dec0b3] transition-all duration-500 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. Step Views */}
      <div className="bg-[#0c0b0b] border border-zinc-900 rounded p-6 sm:p-8 shadow-2xl space-y-8" id="wizard-dynamic-stage">
        
        {/* STEP 1: SERVICE CHOICE */}
        {step === 1 && (
          <div className="space-y-6" id="wizard-step-1">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-serif text-white tracking-wide uppercase">O que vamos criar hoje?</h2>
              <p className="text-zinc-500 text-xs">Selecione um procedimento para moldar e esmaltar suas unhas.</p>
            </div>

            {loadingServices ? (
              <div className="text-center py-12 text-zinc-500 text-xs animate-pulse">
                Carregando serviços do painel administrativo...
              </div>
            ) : services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="wizard-services-grid">
                {services.map((serv) => (
                  <div 
                    key={serv.id}
                    id={`wizard-service-row-${serv.id}`}
                    onClick={() => setSelectedService(serv)}
                    className={`p-4 rounded border cursor-pointer flex items-center justify-between gap-4 transition-all ${
                      selectedService?.id === serv.id
                        ? "border-[#dec0b3] bg-[#161413]/30"
                        : "border-zinc-900/60 bg-zinc-950 hover:bg-[#121110]/35 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded overflow-hidden bg-zinc-900 inline-block shrink-0">
                        <img src={serv.image} alt={serv.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="font-serif text-white text-sm font-semibold truncate">{serv.name}</h4>
                        <p className="text-zinc-500 text-[10px] mt-0.5">• {serv.duration}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-serif font-bold text-[#dec0b3]">R$ {serv.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Nenhum serviço cadastrado no painel administrativo.
              </div>
            )}

            <div className="pt-4 flex justify-end border-t border-zinc-900/60">
              <button
                id="wizard-step1-next"
                disabled={!selectedService}
                onClick={handleNextStep}
                className="flex items-center gap-2 bg-[#dec0b3] disabled:bg-zinc-850 disabled:text-zinc-500 hover:bg-[#b88f7f] text-zinc-950 font-semibold uppercase text-xs tracking-wider py-3 px-6 rounded-sm transition-colors cursor-pointer"
              >
                Escolher Data & Hora
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DATE AND TIMESLOT SELECTION */}
        {step === 2 && selectedService && (
          <div className="space-y-8" id="wizard-step-2">
            
            <div className="flex items-center justify-between p-4 rounded bg-zinc-950 border border-zinc-900" id="wizard-procedure-brief">
              <div className="text-left space-y-0.5 min-w-0">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold block">Procedimento Escolhido</span>
                <h4 className="font-serif text-white text-md font-semibold truncate">{selectedService.name}</h4>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="text-zinc-400 text-xs hidden sm:block">
                  <span className="block font-medium">R$ {selectedService.price}</span>
                  <span className="text-[10px] text-zinc-500 block font-light">{selectedService.duration}</span>
                </div>
                <button 
                  onClick={handlePrevStep} 
                  className="text-[#dec0b3] text-xs font-semibold uppercase tracking-wider underline hover:text-white cursor-pointer"
                >
                  Alterar
                </button>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* Calendar Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-[#dec0b3]" />
                  Selecione o Dia:
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5" id="wizard-calendar-grid">
                  {calendarDays.map((day) => (
                    <div
                      key={day.id}
                      id={`calendar-day-${day.id}`}
                      onClick={() => {
                        setSelectedDate(day.id);
                        setSelectedTime("");
                      }}
                      className={`p-3.5 rounded text-center cursor-pointer transition-all flex flex-col justify-center gap-1 select-none ${
                        selectedDate === day.id
                          ? "bg-[#dec0b3] text-zinc-950 shadow-lg scale-102 border border-[#dec0b3]"
                          : "bg-zinc-950 border border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white"
                      }`}
                    >
                      <span className="text-[9px] tracking-widest uppercase font-bold text-current opacity-60 block leading-none">{day.weekday}</span>
                      <span className="text-xl font-serif font-bold text-current block leading-none my-0.5">{day.number}</span>
                      <span className="text-[9px] uppercase font-semibold text-current opacity-60 block leading-none">{day.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeslot Choices Grid */}
              {selectedDate && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#dec0b3]" />
                    Escolha seu horário preferido (Bloqueio Dinâmico por Conflito):
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="wizard-timeslot-grid">
                    {validatedTimeslots.map(({ time, disabled }) => (
                      <button
                        key={time}
                        id={`timeslot-${time}`}
                        disabled={disabled}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3.5 px-4 text-xs font-mono font-bold tracking-wider rounded border transition-all flex flex-col items-center justify-center gap-1 ${
                          disabled 
                            ? "bg-zinc-950/40 border-zinc-900/50 text-zinc-600 cursor-not-allowed line-through"
                            : selectedTime === time
                            ? "bg-zinc-950 text-[#dec0b3] border-[#dec0b3] shadow-inner font-extrabold"
                            : "bg-[#0d0c0c] border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-white cursor-pointer"
                        }`}
                      >
                        <span>{time}</span>
                        {disabled && <span className="text-[8px] tracking-normal font-sans font-normal normal-case opacity-60">(Ocupado)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="pt-6 border-t border-zinc-900/60 flex items-center justify-between gap-4">
              <button
                onClick={handlePrevStep}
                className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold uppercase tracking-wider py-3 px-5 border border-zinc-900 hover:border-zinc-800 rounded bg-transparent transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>

              <button
                id="wizard-step2-next"
                disabled={!selectedDate || !selectedTime}
                onClick={handleNextStep}
                className="flex items-center gap-2 bg-[#dec0b3] disabled:bg-zinc-850 disabled:text-zinc-500 hover:bg-[#b88f7f] text-zinc-950 font-semibold uppercase text-xs tracking-wider py-3.5 px-6 rounded-sm transition-colors cursor-pointer"
              >
                Prosseguir para Confirmação
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: CLIENT REGISTRATION IDENTIFICATION */}
        {step === 3 && selectedService && selectedDate && selectedTime && (
          <div className="space-y-8" id="wizard-step-3">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-serif text-white tracking-wide uppercase">Pronta para brilhar?</h2>
              <p className="text-zinc-500 text-xs">Forneça seus dados de contato para darmos início ao faturamento da sua agenda.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form entries */}
              <form onSubmit={handleSubmitBooking} className="lg:col-span-7 space-y-5" id="wizard-auth-form">
                
                <div className="space-y-2">
                  <label htmlFor="client-name" className="text-xs font-semibold tracking-wider text-zinc-300 uppercase block">Seu Nome Completo:</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      id="client-name"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Exemplo: Mariana Vasconcelos"
                      className="w-full h-11 bg-[#090808] border border-zinc-900 rounded py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-[#dec0b3]/60 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="client-phone" className="text-xs font-semibold tracking-wider text-zinc-300 uppercase block">Seu WhatsApp de Atendimento:</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="tel"
                        id="client-phone"
                        required
                        maxLength={15} // Limita o tamanho máximo formatado: (11) 99999-9999
                        value={clientPhone}
                        onChange={(e) => {
                          // Pega apenas os números digitados
                          const rawValue = e.target.value.replace(/\D/g, "");
                          
                          // Trava para aceitar no máximo 11 dígitos (DDD + 9 do celular)
                          if (rawValue.length <= 11) {
                            let formatted = rawValue;
                            
                            // Aplica a máscara visualmente bonitinha (XX) XXXXX-XXXX
                            if (rawValue.length > 2 && rawValue.length <= 7) {
                              formatted = `(${rawValue.slice(0, 2)}) ${rawValue.slice(2)}`;
                            } else if (rawValue.length > 7) {
                              formatted = `(${rawValue.slice(0, 2)}) ${rawValue.slice(2, 7)}-${rawValue.slice(7)}`;
                            } else if (rawValue.length > 0) {
                              formatted = `(${rawValue}`;
                            }
                            
                            setClientPhone(formatted);
                          }
                        }}
                        placeholder="Exemplo: (11) 99999-9999"
                        className="w-full h-11 bg-[#090808] border border-zinc-900 rounded py-2 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-[#dec0b3]/60 transition-colors"
                      />
                    </div>
                  </div>

                <div className="grid grid-cols-3 gap-3 pt-2" id="wizard-badges">
                  <div className="p-3 text-center rounded bg-zinc-950/40 border border-zinc-900">
                    <span className="text-[8px] text-[#dec0b3] font-bold block uppercase tracking-widest leading-none mb-1">Agendamento</span>
                    <span className="text-[10px] text-zinc-400 font-semibold block uppercase">100% Seguro</span>
                  </div>
                  <div className="p-3 text-center rounded bg-zinc-950/40 border border-zinc-900">
                    <span className="text-[8px] text-[#dec0b3] font-bold block uppercase tracking-widest leading-none mb-1">Equipe</span>
                    <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Certificada</span>
                  </div>
                  <div className="p-3 text-center rounded bg-zinc-950/40 border border-zinc-900">
                    <span className="text-[8px] text-[#dec0b3] font-bold block uppercase tracking-widest leading-none mb-1">Higiene</span>
                    <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Hospitalar</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-900/60 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold uppercase tracking-wider py-3 px-5 border border-zinc-900 hover:border-zinc-800 rounded bg-transparent transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar
                  </button>

                  <button
                    type="submit"
                    id="wizard-btn-submit-booking"
                    className="flex items-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 font-bold uppercase text-xs tracking-wider py-3.5 px-6 rounded-sm transition-colors cursor-pointer"
                  >
                    Reservar Momento
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </form>

              {/* Booking Summary Box: Right side */}
              <div className="lg:col-span-5 bg-[#090808] border border-zinc-900 p-5 rounded space-y-5" id="wizard-checkout-summary">
                <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold block border-b border-zinc-900 pb-2">Sumário do Atendimento</span>
                
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded overflow-hidden shrink-0 bg-zinc-950 border border-zinc-900">
                    <img src={selectedService.image} alt={selectedService.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif text-white text-sm font-semibold truncate leading-snug">{selectedService.name}</h4>
                    <span className="text-[10px] text-[#dec0b3] uppercase tracking-wider font-semibold block mt-1">R$ {selectedService.price}</span>
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-zinc-900/60 pt-4 text-xs font-sans text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Duração Prevista:</span>
                    <span className="text-zinc-200 font-semibold">{selectedService.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Escolhida:</span>
                    <span className="text-zinc-200 font-semibold">{getFormattedDate(selectedDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Horário de Início:</span>
                    <span className="text-zinc-200 font-semibold">{selectedTime}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded flex gap-2.5 items-start">
                  <div className="p-1 rounded bg-[#dec0b3]/10 text-[#dec0b3] mt-0.5 border border-[#dec0b3]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-200 uppercase block">Garantia Atendimento</span>
                    <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">Sua reserva assegura tempo dedicado exclusivo sem esperas.</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION AND WHATSAPP REDIRECT */}
        {step === 4 && confirmedBooking && (
          <div className="text-center p-4 sm:p-10 space-y-8 max-w-xl mx-auto" id="wizard-step-4">
            
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-emerald-500/10 rounded-full animate-ping pointer-events-none"></div>
              <div className="p-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 inline-block relative z-10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-[#dec0b3] uppercase tracking-[0.25em] font-bold block">Reserva Registrada Pré-confirmada!</span>
              <h2 className="text-3xl font-serif text-white uppercase leading-normal">Inspiradora Escolha, {confirmedBooking.clientName}!</h2>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-sm mx-auto">
                Para consolidar o block de agenda e receber as instruções de chegada, clique no botão e acione nosso atendimento no WhatsApp.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded p-5 text-left space-y-4 shadow-xl" id="confirmation-booking-ticket">
              <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase font-mono">Código da Agenda</span>
                <span className="text-xs font-mono font-bold text-[#dec0b3]">#{confirmedBooking.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-4 text-xs font-sans">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Procedimento</span>
                  <span className="text-zinc-200 font-semibold block mt-0.5 truncate">{confirmedBooking.serviceName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Preço Estimado</span>
                  <span className="text-[#dec0b3] font-semibold block mt-0.5">R$ {confirmedBooking.price}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Data / Dia</span>
                  <span className="text-zinc-200 font-semibold block mt-0.5">{getFormattedDate(confirmedBooking.date)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Horário Reservado</span>
                  <span className="text-[#dec0b3] font-mono font-bold block mt-0.5">{confirmedBooking.time}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <a 
                href={getWhatsAppLink(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                id="wizard-btn-whatsapp-redirect"
                className="w-full flex items-center justify-center gap-2.5 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 font-bold uppercase text-xs tracking-wider py-4 px-6 rounded-sm shadow-xl shadow-[#dec0b3]/10 transition-colors"
              >
                <Send className="w-4 h-4" />
                Finalizar no WhatsApp
              </a>

              <p className="text-[10px] text-zinc-500 font-light">
                *O clique acima abrirá o aplicativo oficial do WhatsApp preenchendo todos os detalhes automaticamente.
              </p>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};