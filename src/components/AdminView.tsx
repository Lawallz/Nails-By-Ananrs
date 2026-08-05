import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Trash2, Plus, DollarSign, Calendar, Clock, User, Phone } from "lucide-react";

interface Booking {
  id: string;
  serviceName: string;
  price: number;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: string;
  image: string;
}

export const AdminView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newImage, setNewImage] = useState("");

  const fetchData = async () => {
    setLoading(true);
    
    // Busca agendamentos do Supabase
    const { data: bookingsData, error: bError } = await supabase.from('bookings').select('*');
    if (bError) console.error("Erro ao buscar bookings:", bError);
    
    if (bookingsData) {
      // Mapeia os dados garantindo compatibilidade com diferentes nomes de colunas no banco
      const formattedBookings = bookingsData.map((b: any) => ({
        id: b.id,
        serviceName: b.serviceName || b.service_name || "Procedimento",
        price: b.price || 0,
        date: b.date || "",
        time: b.time || "",
        clientName: b.clientName || b.client_name || b.name || "Cliente não informada",
        clientPhone: b.clientPhone || b.client_phone || b.phone || "Não informado"
      }));
      setBookings(formattedBookings);
    }

    // Busca serviços
    const { data: servicesData, error: sError } = await supabase.from('services').select('*');
    if (sError) console.error("Erro ao buscar services:", sError);
    if (servicesData) setServices(servicesData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteBooking = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este agendamento?")) {
      await supabase.from('bookings').delete().eq('id', id);
      fetchData();
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice || !newDuration || !newImage) return;

    const id = newName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const { error } = await supabase.from('services').upsert([
      {
        id,
        name: newName,
        price: parseFloat(newPrice),
        duration: newDuration,
        image: newImage
      }
    ]);

    if (!error) {
      alert("Serviço salvo com sucesso!");
      setNewName("");
      setNewPrice("");
      setNewDuration("");
      setNewImage("");
      fetchData();
    } else {
      alert("Erro ao salvar serviço: " + error.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Deseja excluir este procedimento do site?")) {
      await supabase.from('services').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 text-left text-zinc-100">
      
      <div className="border-b border-zinc-800 pb-6">
        <span className="text-[10px] text-[#dec0b3] font-bold uppercase tracking-[0.3em] block mb-1">Painel Exclusivo</span>
        <h1 className="text-3xl font-serif tracking-wide uppercase text-white">Gerenciamento do Estúdio</h1>
        <p className="text-xs text-zinc-400 mt-1">Gerencie os horários agendados pelas clientes e altere valores ou serviços em tempo real.</p>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500 animate-pulse">Carregando dados da nuvem...</p>
      ) : (
        <div className="space-y-16">
          
          {/* Agendamentos */}
          <div className="space-y-6">
            <h2 className="text-xl font-serif text-[#dec0b3] uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Agendamentos Confirmados ({bookings.length})
            </h2>

            {bookings.length === 0 ? (
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded text-center text-zinc-500 text-xs">
                Nenhum agendamento registrado até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.map((b) => (
                  <div key={b.id} className="bg-zinc-950 border border-zinc-900 p-5 rounded relative space-y-3 shadow-xl">
                    <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                      <div>
                        <span className="text-[10px] font-mono text-[#dec0b3] font-bold">#{b.id}</span>
                        <h4 className="font-serif text-sm font-semibold text-white mt-0.5">{b.serviceName}</h4>
                      </div>
                      <button 
                        onClick={() => handleDeleteBooking(b.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-300">
                      <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-[#dec0b3]" /> <strong className="text-white">{b.clientName}</strong></p>
                      <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#dec0b3]" /> {b.clientPhone}</p>
                      <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[#dec0b3]" /> {b.date}</p>
                      <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-[#dec0b3]" /> <span className="text-[#dec0b3] font-bold font-mono">{b.time}</span></p>
                    </div>

                    <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-xs">
                      <span className="text-zinc-500 uppercase text-[10px]">Valor:</span>
                      <span className="font-serif font-bold text-[#dec0b3]">R$ {b.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Serviços */}
          <div className="space-y-6 pt-8 border-t border-zinc-800">
            <h2 className="text-xl font-serif text-[#dec0b3] uppercase flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Catálogo de Serviços & Preços
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <form onSubmit={handleAddService} className="lg:col-span-5 bg-zinc-950 border border-zinc-900 p-6 rounded space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300 border-b border-zinc-900 pb-2">Adicionar / Atualizar Serviço</h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold">Nome do Procedimento:</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Banho de Gel" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#dec0b3]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-zinc-400 font-semibold">Preço (R$):</label>
                    <input 
                      type="number" 
                      required
                      placeholder="120" 
                      value={newPrice} 
                      onChange={e => setNewPrice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#dec0b3]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-zinc-400 font-semibold">Duração:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="01:30" 
                      value={newDuration} 
                      onChange={e => setNewDuration(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#dec0b3]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-zinc-400 font-semibold">URL da Imagem (Foto):</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://exemplo.com/foto.jpg" 
                    value={newImage} 
                    onChange={e => setNewImage(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-[#dec0b3]"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 font-bold uppercase text-xs tracking-wider py-3 rounded transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Salvar Serviço no Site
                </button>
              </form>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.length === 0 ? (
                  <div className="sm:col-span-2 p-6 bg-zinc-950 border border-zinc-900 rounded text-center text-zinc-500 text-xs">
                    Nenhum serviço cadastrado na nuvem ainda. Adicione ao lado!
                  </div>
                ) : (
                  services.map((serv) => (
                    <div key={serv.id} className="bg-zinc-950 border border-zinc-900 p-4 rounded flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={serv.image} alt={serv.name} className="w-12 h-12 rounded object-cover shrink-0 bg-zinc-900" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <h4 className="font-serif text-sm font-semibold text-white truncate">{serv.name}</h4>
                          <p className="text-[10px] text-zinc-500">{serv.duration} • <span className="text-[#dec0b3] font-bold">R$ {serv.price}</span></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteService(serv.id)}
                        className="text-zinc-600 hover:text-red-400 p-2 transition-colors shrink-0 cursor-pointer"
                        title="Excluir serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};