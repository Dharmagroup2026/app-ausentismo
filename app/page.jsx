'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Building2, FileText, Upload, Search, ListFilter, Trophy } from 'lucide-react';

const COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#EF4444', '#10B981'];

export default function AusentismoDashboard() {
  const [registros, setRegistros] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('TODAS');
  const [supervisorFiltro, setSupervisorFiltro] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vistaTabla, setVistaTabla] = useState('ranking'); // 'ranking' o 'historial'

  const manejarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const datosMapeados = result.data.map((r, i) => ({
          id: i + 1,
          fecha: r['FECHA'] || r['Fecha'] || 'N/A',
          nombre: r['NOMBRE'] || r['Nombre'] || 'Desconocido',
          motivo: r['MOTIVO'] || r['Motivo'] || 'Sin Especificar',
          certif: (r['CERTIF.'] || r['Certif.'] || r['CERTIFICADO'] || 'NO').trim().toUpperCase(),
          empresa: r['EMPRESA'] || r['Empresa'] || 'Sin Empresa',
          supervisor: r['SUPERVISOR'] || r['Supervisor'] || 'Sin Asignar',
          cantDias: parseInt(r['CANT. DIAS'] || r['Cant. Dias'] || r['CANT DIAS'] || 1, 10),
          observaciones: r['OBSERVACIONES'] || r['Observaciones'] || '-'
        }));
        setRegistros(datosMapeados);
      }
    });
  };

  const empresasUnicas = useMemo(() => ['TODAS', ...new Set(registros.map(r => r.empresa))], [registros]);
  const supervisoresUnicos = useMemo(() => ['TODOS', ...new Set(registros.map(r => r.supervisor))], [registros]);

  const datosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const cumpleEmpresa = empresaFiltro === 'TODAS' || r.empresa === empresaFiltro;
      const cumpleSupervisor = supervisorFiltro === 'TODOS' || r.supervisor === supervisorFiltro;
      const cumpleBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                             r.motivo.toLowerCase().includes(busqueda.toLowerCase());
      return cumpleEmpresa && cumpleSupervisor && cumpleBusqueda;
    });
  }, [registros, empresaFiltro, supervisorFiltro, busqueda]);

  const totalDias = useMemo(() => datosFiltrados.reduce((acc, r) => acc + r.cantDias, 0), [datosFiltrados]);
  const totalAusencias = datosFiltrados.length;
  const conCertificado = datosFiltrados.filter(r => r.certif === 'SI' || r.certif === 'S').length;
  const pctCertificado = totalAusencias > 0 ? ((conCertificado / totalAusencias) * 100).toFixed(1) : 0;

  const dataEmpresas = useMemo(() => {
    const map = {};
    datosFiltrados.forEach(r => {
      map[r.empresa] = (map[r.empresa] || 0) + r.cantDias;
    });
    return Object.keys(map).map(k => ({ nombre: k, dias: map[k] }));
  }, [datosFiltrados]);

  const dataMotivos = useMemo(() => {
    const map = {};
    datosFiltrados.forEach(r => {
      map[r.motivo] = (map[r.motivo] || 0) + r.cantDias;
    });
    return Object.keys(map).map(k => ({ name: k, value: map[k] }));
  }, [datosFiltrados]);

  const topPersonas = useMemo(() => {
    const map = {};
    datosFiltrados.forEach(r => {
      if (!map[r.nombre]) {
        map[r.nombre] = { nombre: r.nombre, empresa: r.empresa, supervisor: r.supervisor, dias: 0, faltas: 0 };
      }
      map[r.nombre].dias += r.cantDias;
      map[r.nombre].faltas += 1;
    });
    return Object.values(map).sort((a, b) => b.dias - a.dias);
  }, [datosFiltrados]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-blue-500" /> Tablero de Control de Ausentismo
          </h1>
          <p className="text-slate-400 text-sm">Monitoreo en tiempo real de faltas, motivos y métricas por equipo</p>
        </div>
        <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer transition text-sm font-medium">
          <Upload className="w-4 h-4" /> Importar Planilla (.csv)
          <input type="file" accept=".csv" onChange={manejarArchivo} className="hidden" />
        </label>
      </header>

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center my-20 text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-800">
          <FileText className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white">No hay datos cargados</h3>
          <p className="text-slate-400 max-w-md text-sm mt-1">Sube tu planilla de ausencias para generar los tableros automáticamente.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">EMPRESA</label>
              <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                {empresasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">SUPERVISOR</label>
              <select value={supervisorFiltro} onChange={(e) => setSupervisorFiltro(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                {supervisoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">BUSCAR COLABORADOR</label>
              <div className="relative">
                <input type="text" placeholder="Nombre o motivo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-bold text-red-400 tracking-wider uppercase">Días Totales Perdidos</span>
              <p className="text-3xl font-extrabold text-white mt-1">{totalDias} <span className="text-sm font-normal text-slate-400">días</span></p>
            </div>
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Total de Ausencias</span>
              <p className="text-3xl font-extrabold text-white mt-1">{totalAusencias} <span className="text-sm font-normal text-slate-400">registros</span></p>
            </div>
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">% Con Certificado</span>
              <p className="text-3xl font-extrabold text-white mt-1">{pctCertificado}% <span className="text-sm font-normal text-slate-400">respaldadas</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Días Perdidos por Empresa</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataEmpresas}>
                  <XAxis dataKey="nombre" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFFFFF' }}
                    itemStyle={{ color: '#60A5FA' }}
                  />
                  <Bar dataKey="dias" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Distribución por Motivo</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dataMotivos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {dataMotivos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#93C5FD', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla Dinámica: Ranking vs Historial */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {vistaTabla === 'ranking' ? <Trophy className="w-4 h-4 text-yellow-500" /> : <ListFilter className="w-4 h-4 text-blue-500" />}
                {vistaTabla === 'ranking' ? 'Personas con Mayor Ausentismo' : 'Historial Detallado de Licencias'}
              </h3>
              
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs font-medium">
                <button 
                  onClick={() => setVistaTabla('ranking')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'ranking' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Mayor Ausentismo
                </button>
                <button 
                  onClick={() => setVistaTabla('historial')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'historial' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Todas las Licencias
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {vistaTabla === 'ranking' ? (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3 text-center">N° Faltas</th>
                      <th className="p-3 text-center">Días Totales Perdidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {topPersonas.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/30">
                        <td className="p-3 font-medium text-white">{p.nombre}</td>
                        <td className="p-3 text-slate-400">{p.empresa}</td>
                        <td className="p-3 text-slate-400">{p.supervisor}</td>
                        <td className="p-3 text-center font-bold text-blue-400">{p.faltas}</td>
                        <td className="p-3 text-center font-bold text-red-400">{p.dias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3">Motivo</th>
                      <th className="p-3 text-center">Días</th>
                      <th className="p-3 text-center">Certificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {datosFiltrados.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-700/30">
                        <td className="p-3 text-slate-400">{r.fecha}</td>
                        <td className="p-3 font-medium text-white">{r.nombre}</td>
                        <td className="p-3 text-slate-400">{r.empresa}</td>
                        <td className="p-3 text-slate-400">{r.supervisor}</td>
                        <td className="p-3 text-blue-300">{r.motivo}</td>
                        <td className="p-3 text-center font-bold text-red-400">{r.cantDias}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.certif === 'SI' || r.certif === 'S' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {r.certif}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
