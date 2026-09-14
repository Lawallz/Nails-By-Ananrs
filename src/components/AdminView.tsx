import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Trash2, Plus, DollarSign, Calendar, Clock, User, Phone, Pencil, X, Loader2 } from "lucide-react";

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!imageFile) { setPreview(""); return; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const resetForm = () => {
    setEditingId(null); setNewName(""); setNewPrice("");
    setNewDuration(""); setNewImage(""); setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const editService = (service: Service) => {
    setEditingId(service.id); setNewName(service.name);
    setNewPrice(String(service.price)); setNewDuration(service.duration);
    setNewImage(service.image); setImageFile(null); setFailure(""); setMessage("");
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector<HTMLInputElement>('input[type="text"]')?.focus({ preventScroll: true });
  };

  const selectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFailure("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFailure("Escolha uma foto JPG, PNG ou WebP com até 5 MB.");
      event.target.value = ""; return;
    }
    setImageFile(file);
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Busca agendamentos do Supabase
    const { data: bookingsData, error: bError } = await supabase.from('bookings').select('*');
    if (bError) setFailure("Não foi possível carregar os agendamentos: " + bError.message);
    
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
    if (sError) setFailure("Não foi possível carregar os serviços: " + sError.message);
    if (servicesData) setServices(servicesData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteBooking = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este agendamento?")) {
      const { data, error } = await supabase.from('bookings').delete().eq('id', id).select('id');
      if (error || !data?.length) { setFailure(error?.message || 'Não foi possível excluir o agendamento.'); return; }
      setBookings(current => current.filter(booking => booking.id !== id));
    }
  };

  const handleAddService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    setFailure(""); setMessage("");
    const price = Number(newPrice.replace(",", "."));
    if (!newName.trim() || !newDuration.trim() || !newPrice.trim() || !Number.isFinite(price) || price < 0) {
      setFailure("Preencha nome, duração e um preço válido."); return;
    }
    if (!imageFile && !newImage) { setFailure("Escolha uma foto para o serviço."); return; }
    busyRef.current = true; setSaving(true);
    let uploadedPath: string | null = null;
    let saved = false;
    try {
      let image = newImage;
      if (imageFile) {
        const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[imageFile.type];
        const path = `services/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("services-images").upload(path, imageFile, { contentType: imageFile.type, upsert: false });
        if (error) throw error;
        uploadedPath = path;
        image = supabase.storage.from("services-images").getPublicUrl(path).data.publicUrl;
      }
      const fields = { name: newName.trim(), price, duration: newDuration.trim(), image };
      const query = editingId
        ? supabase.from("services").update(fields).eq("id", editingId)
        : supabase.from("services").insert({ id: crypto.randomUUID(), ...fields });
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      if (!data) throw new Error("O serviço não foi salvo. Confira seu acesso.");
      saved = true;
      setServices(current => editingId ? current.map(service => service.id === editingId ? data : service) : [...current, data]);
      setMessage(editingId ? "Alterações salvas!" : "Serviço cadastrado!");
      resetForm();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : (error as { message?: string })?.message || "Não foi possível salvar o serviço.");
      if (uploadedPath && !saved) {
        const { error: cleanupError } = await supabase.storage.from("services-images").remove([uploadedPath]);
        if (cleanupError) setFailure(current => current + " A foto enviada ficou no armazenamento; tente salvar novamente.");
      }
    } finally { busyRef.current = false; setSaving(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Deseja excluir este procedimento do site?")) {
      const { data, error } = await supabase.from('services').delete().eq('id', id).select('id');
      if (error || !data?.length) { setFailure(error?.message || 'Não foi possível excluir o serviço.'); return; }
      setServices(current => current.filter(service => service.id !== id));
      if (editingId === id) resetForm();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 text-left text-zinc-100">
      
      <div className="border-b border-zinc-800 pb-6">
        <span className="text-[10px] text-[#dec0b3] font-bold uppercase tracking-[0.3em] block mb-1">Painel Exclusivo</span>
        <h1 className="text-3xl font-serif tracking-wide uppercase text-white">Gerenciamento do Estúdio</h1>
        <p className="text-xs text-zinc-400 mt-1">Gerencie os horários agendados pelas clientes e altere valores ou serviços em tempo real.</p>
      </div>

      {failure && <p role="alert" className="text-sm text-rose-400">{failure}</p>}
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
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
              
              <form ref={formRef} onSubmit={handleAddService} className="lg:col-span-5 bg-zinc-950 border border-zinc-900 p-6 rounded space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300 border-b border-zinc-900 pb-2">{editingId ? "Editar serviço" : "Adicionar serviço"}</h3>
                
                <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
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
                      type="number" min="0" step="0.01"
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

                <div className="space-y-3">
                  <label htmlFor="service-photo" className="block text-xs text-zinc-300">Foto do serviço</label>
                  {(preview || newImage) && <img src={preview || newImage} alt="Prévia da foto do serviço" className="w-full h-44 rounded object-cover" />}
                  <input id="service-photo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} disabled={saving} className="block w-full text-xs text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-[#dec0b3] file:px-3 file:py-2 file:text-zinc-950" />
                  <p className="text-xs text-zinc-500">JPG, PNG ou WebP, até 5 MB. {editingId ? "Para manter a foto atual, não selecione outra." : "Escolha uma foto do seu aparelho."}</p>
                  {imageFile && <button type="button" disabled={saving} onClick={() => { setImageFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs text-zinc-300 underline">Desfazer seleção da foto</button>}
                </div>
                <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-[#dec0b3] text-zinc-950 font-bold text-sm py-3 rounded disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar serviço"}
                </button>
                {editingId && <button type="button" disabled={saving} onClick={resetForm} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-400"><X className="w-4 h-4" /> Cancelar edição</button>}

                </fieldset>
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
                      <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" disabled={saving} onClick={() => editService(serv)} className="flex items-center gap-1 text-[#dec0b3] text-xs p-2 disabled:opacity-50"><Pencil className="w-4 h-4" /> Editar</button>
                      <button disabled={saving}
                        onClick={() => handleDeleteService(serv.id)}
                        className="text-zinc-600 hover:text-red-400 p-2 transition-colors shrink-0 cursor-pointer"
                        title="Excluir serviço" aria-label={`Excluir ${serv.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      </div>
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