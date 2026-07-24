'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { FileText, Upload, Search, ListFilter, Trophy, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';

// Paleta de Colores Personalizada: Terracota, Mostaza, Rojo y Grises
const COLORS = ['#C05621', '#D69E2E', '#E53E3E', '#9B2C2C', '#DD6B20', '#B7791F', '#718096'];

function obtenerCampo(row, posiblesNombres) {
  const llaves = Object.keys(row);
  for (let campo of posiblesNombres) {
    const llaveEncontrada = llaves.find(k => k.trim().toUpperCase() === campo.toUpperCase());
    if (llaveEncontrada && row[llaveEncontrada] !== undefined && row[llaveEncontrada] !== null) {
      const val = String(row[llaveEncontrada]).trim();
      if (val.length > 0) return val;
    }
  }
  return '';
}

export default function AusentismoDashboard() {
  const [registros, setRegistros] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('TODAS');
  const [supervisorFiltro, setSupervisorFiltro] = useState('TODOS');
  const [mesFiltro, setMesFiltro] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vistaTabla, setVistaTabla] = useState('ranking');

  // Cargar datos guardados previamente
  useEffect(() => {
    const datosGuardados = localStorage.getItem('ausentismo_datos_csv');
    if (datosGuardados) {
      try {
        setRegistros(JSON.parse(datosGuardados));
      } catch (e) {
        console.error("Error al cargar datos de localStorage", e);
      }
    }
  }, []);

  const manejarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      complete: (result) => {
        const datosMapeados = result.data.map((r, i) => {
          const fechaTexto = obtenerCampo(r, ['FECHA', 'Fecha']) || 'N/A';
          let mesNom = obtenerCampo(r, ['MES', 'Mes', 'MESES']);
          if (!mesNom) mesNom = 'Sin Mes';

          return {
            id: i + 1,
            fecha: fechaTexto,
            mes: mesNom.toUpperCase(),
            nombre: obtenerCampo(r, ['NOMBRE', 'Nombre', 'COLABORADOR']) || 'Desconocido',
            motivo: obtenerCampo(r, ['MOTIVO', 'Motivo', 'CAUSA']) || 'Sin Especificar',
            certif: (obtenerCampo(r, ['CERTIF.', 'CERTIF', 'Certif.', 'CERTIFICADO']) || 'NO').toUpperCase(),
            empresa: obtenerCampo(r, ['EMPRESA', 'Empresa']) || 'Sin Empresa',
            supervisor: obtenerCampo(r, ['SUPERVISOR', 'Supervisor']) || 'Sin Asignar',
            cantDias: parseInt(obtenerCampo(r, ['CANT. DIAS', 'CANT DIAS', 'Cant. Dias', 'DIAS']) || '1', 10),
            observaciones: obtenerCampo(r, ['OBSERVACIONES', 'Observaciones']) || '-'
          };
        });

        setRegistros(datosMapeados);
        localStorage.setItem('ausentismo_datos_csv', JSON.stringify(datosMapeados));
      }
    });
  };

  const empresasUnicas = useMemo(() => ['TODAS', ...new Set(registros.map(r => r.empresa))], [registros]);

  const supervisoresUnicos = useMemo(() => {
    let registrosEmpresa = registros;
    if (empresaFiltro !== 'TODAS') {
      registrosEmpresa = registros.filter(r => r.empresa === empresaFiltro);
    }
    const listaSupervisores = [...new Set(registrosEmpresa.map(r => r.supervisor))];
    return ['TODOS', ...listaSupervisores];
  }, [registros, empresaFiltro]);

  const manejarCambioEmpresa = (nuevaEmpresa) => {
    setEmpresaFiltro(nuevaEmpresa);
    setSupervisorFiltro('TODOS');
  };

  const mesesUnicos = useMemo(() => {
    const lista = [...new Set(registros.map(r => r.mes).filter(m => m && m !== 'SIN MES'))];
    return ['TODOS', ...lista];
  }, [registros]);

  const datosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const cumpleEmpresa = empresaFiltro === 'TODAS' || r.empresa === empresaFiltro;
      const cumpleSupervisor = supervisorFiltro === 'TODOS' || r.supervisor === supervisorFiltro;
      const cumpleMes = mesFiltro === 'TODOS' || r.mes.toUpperCase() === mesFiltro.toUpperCase();
      const cumpleBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                             r.motivo.toLowerCase().includes(busqueda.toLowerCase());
      return cumpleEmpresa && cumpleSupervisor && cumpleMes && cumpleBusqueda;
    });
  }, [registros, empresaFiltro, supervisorFiltro, mesFiltro, busqueda]);

  const totalDias = useMemo(() => datosFiltrados.reduce((acc, r) => acc + (isNaN(r.cantDias) ? 1 : r.cantDias), 0), [datosFiltrados]);
  const totalAusencias = datosFiltrados.length;
  const conCertificado = datosFiltrados.filter(r => r.certif === 'SI' || r.certif === 'S').length;
  const pctCertificado = totalAusencias > 0 ? ((conCertificado / totalAusencias) * 100).toFixed(1) : 0;

  const colaboradoresRecurrentes = useMemo(() => {
    const mapaPersonas = {};

    const datosBase = registros.filter(r => {
      const cumpleEmpresa = empresaFiltro === 'TODAS' || r.empresa === empresaFiltro;
      const cumpleSupervisor = supervisorFiltro === 'TODOS' || r.supervisor === supervisorFiltro;
      return cumpleEmpresa && cumpleSupervisor;
    });

    datosBase.forEach(r => {
      if (!mapaPersonas[r.nombre]) {
        mapaPersonas[r.nombre] = { 
          nombre: r.nombre, 
          empresa: r.empresa, 
          supervisor: r.supervisor, 
          mesesConFalta: new Set(),
          totalDias: 0,
          totalFaltas: 0
        };
      }
      if (r.mes && r.mes !== 'SIN MES') {
        mapaPersonas[r.nombre].mesesConFalta.add(r.mes);
      }
      mapaPersonas[r.nombre].totalDias += isNaN(r.cantDias) ? 1 : r.cantDias;
      mapaPersonas[r.nombre].totalFaltas += 1;
    });

    return Object.values(mapaPersonas)
      .map(p => {
        const cantMeses = p.mesesConFalta.size;
        const promedioMensual = p.totalDias / Math.max(1, cantMeses);
        const proyectadoAnual = Math.round(promedioMensual * 12);
        
        return {
          ...p,
          cantMeses,
          promedioMensual: promedioMensual.toFixed(1),
          proyectadoAnual
        };
      })
      .filter(p => p.cantMeses >= 2)
      .sort((a, b) => b.proyectadoAnual - a.proyectadoAnual);
  }, [registros, empresaFiltro, supervisorFiltro]);

  const dataEmpresas = useMemo(() => {
    const map = {};
    datosFiltrados.forEach(r => {
      map[r.empresa] = (map[r.empresa] || 0) + (isNaN(r.cantDias) ? 1 : r.cantDias);
    });
    return Object.keys(map).map(k => ({ nombre: k, dias: map[k] }));
  }, [datosFiltrados]);

  const dataMotivos = useMemo(() => {
    const map = {};
    datosFiltrados.forEach(r => {
      map[r.motivo] = (map[r.motivo] || 0) + (isNaN(r.cantDias) ? 1 : r.cantDias);
    });
    return Object.keys(map).map(k => ({ name: k, value: map[k] }));
  }, [datosFiltrados]);

  const topPersonas = useMemo(() => {
    const map = {};
    datosFiltrados.forEach(r => {
      if (!map[r.nombre]) {
        map[r.nombre] = { nombre: r.nombre, empresa: r.empresa, supervisor: r.supervisor, dias: 0, faltas: 0 };
      }
      map[r.nombre].dias += isNaN(r.cantDias) ? 1 : r.cantDias;
      map[r.nombre].faltas += 1;
    });
    return Object.values(map).sort((a, b) => b.dias - a.dias);
  }, [datosFiltrados]);

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 p-6 font-sans">
      {/* Encabezado Personalizado Dharma Group */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-gray-800 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C05621] to-[#D69E2E] flex items-center justify-center font-extrabold text-white text-xl shadow-lg border border-[#D69E2E]/30 shrink-0">
            DG
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Dharma Group <span className="text-[#D69E2E] font-normal">| Control de Ausentismo</span>
            </h1>
            <p className="text-gray-400 text-sm">Monitoreo corporativo de faltas, motivos y proyecciones</p>
          </div>
        </div>
        <label className="flex items-center gap-2 bg-[#C05621] hover:bg-[#DD6B20] text-white px-5 py-2.5 rounded-lg cursor-pointer transition text-sm font-semibold shadow-md border border-[#C05621]/50">
          <Upload className="w-4 h-4" /> Importar Planilla (.csv)
          <input type="file" accept=".csv" onChange={manejarArchivo} className="hidden" />
        </label>
      </header>

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center my-20 text-center p-8 bg-[#1E1E1E] rounded-2xl border border-gray-800">
          <FileText className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-white">No hay datos cargados</h3>
          <p className="text-gray-400 max-w-md text-sm mt-1">Sube tu planilla de ausencias para generar los tableros de Dharma Group.</p>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6">
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">MES</label>
              <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 uppercase focus:border-[#D69E2E] outline-none">
                {mesesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">EMPRESA</label>
              <select value={empresaFiltro} onChange={(e) => manejarCambioEmpresa(e.target.value)} className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-[#D69E2E] outline-none">
                {empresasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">SUPERVISOR</label>
              <select value={supervisorFiltro} onChange={(e) => setSupervisorFiltro(e.target.value)} className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-[#D69E2E] outline-none">
                {supervisoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">BUSCAR COLABORADOR</label>
              <div className="relative">
                <input type="text" placeholder="Nombre o motivo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 focus:border-[#D69E2E] outline-none" />
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1E1E1E] p-5 rounded-xl border border-gray-800">
              <span className="text-xs font-bold text-[#E53E3E] tracking-wider uppercase">Días Totales Perdidos</span>
              <p className="text-3xl font-extrabold text-white mt-1">{totalDias} <span className="text-sm font-normal text-gray-400">días</span></p>
            </div>
            <div className="bg-[#1E1E1E] p-5 rounded-xl border border-gray-800">
              <span className="text-xs font-bold text-[#D69E2E] tracking-wider uppercase">Total de Ausencias</span>
              <p className="text-3xl font-extrabold text-white mt-1">{totalAusencias} <span className="text-sm font-normal text-gray-400">registros</span></p>
            </div>
            <div className="bg-[#1E1E1E] p-5 rounded-xl border border-gray-800">
              <span className="text-xs font-bold text-[#C05621] tracking-wider uppercase">% Con Certificado</span>
              <p className="text-3xl font-extrabold text-white mt-1">{pctCertificado}% <span className="text-sm font-normal text-gray-400">respaldadas</span></p>
            </div>
            
            <div className="bg-[#1E1E1E] p-5 rounded-xl border border-[#D69E2E]/40 relative">
              <span className="text-xs font-bold text-[#D69E2E] tracking-wider uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D69E2E]" /> Faltas Recurrentes
              </span>
              <p className="text-3xl font-extrabold text-[#D69E2E] mt-1">
                {colaboradoresRecurrentes.length} <span className="text-sm font-normal text-gray-400">personas</span>
              </p>
              
              {colaboradoresRecurrentes.length > 0 && (
                <div className="mt-2 text-xs text-gray-300 border-t border-gray-800 pt-2">
                  <span className="font-semibold text-[#D69E2E] block mb-1">Colaboradores en riesgo:</span>
                  <div className="max-h-16 overflow-y-auto space-y-0.5 pr-1">
                    {colaboradoresRecurrentes.map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-gray-300">
                        <span className="truncate max-w-[130px]">• {c.nombre}</span>
                        <span className="text-[#E53E3E] font-bold shrink-0">{c.totalDias}d ({c.cantMeses}m)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#1E1E1E] p-5 rounded-xl border border-gray-800">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Días Perdidos por Empresa</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataEmpresas}>
                  <XAxis dataKey="nombre" stroke="#A0AEC0" fontSize={12} />
                  <YAxis stroke="#A0AEC0" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A202C', borderColor: '#2D3748', borderRadius: '8px', color: '#FFFFFF' }}
                    itemStyle={{ color: '#D69E2E' }}
                  />
                  <Bar dataKey="dias" fill="#C05621" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#1E1E1E] p-5 rounded-xl border border-gray-800">
              <h3 className="text-sm font-bold text-gray-200 mb-4">Distribución por Motivo</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dataMotivos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {dataMotivos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A202C', borderColor: '#2D3748', borderRadius: '8px', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#D69E2E', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla Dinámica */}
          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                {vistaTabla === 'ranking' && <Trophy className="w-4 h-4 text-[#D69E2E]" />}
                {vistaTabla === 'historial' && <ListFilter className="w-4 h-4 text-[#C05621]" />}
                {vistaTabla === 'recurrentes' && <TrendingUp className="w-4 h-4 text-[#E53E3E]" />}
                
                {vistaTabla === 'ranking' && 'Personas con Mayor Ausentismo'}
                {vistaTabla === 'historial' && 'Historial Detallado de Licencias'}
                {vistaTabla === 'recurrentes' && 'Análisis de Recurrencia y Proyección Anual'}
              </h3>
              
              <div className="flex bg-[#121212] p-1 rounded-lg border border-gray-800 text-xs font-medium">
                <button 
                  onClick={() => setVistaTabla('ranking')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'ranking' ? 'bg-[#C05621] text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Mayor Ausentismo
                </button>
                <button 
                  onClick={() => setVistaTabla('recurrentes')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'recurrentes' ? 'bg-[#D69E2E] text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Recurrentes y Proyectado
                </button>
                <button 
                  onClick={() => setVistaTabla('historial')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'historial' ? 'bg-[#C05621] text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Todas las Licencias
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {vistaTabla === 'ranking' && (
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-[#121212] text-xs uppercase text-gray-400 font-semibold">
                    <tr>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3 text-center">N° Faltas</th>
                      <th className="p-3 text-center">Días Totales Perdidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {topPersonas.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/40">
                        <td className="p-3 font-medium text-white">{p.nombre}</td>
                        <td className="p-3 text-gray-400">{p.empresa}</td>
                        <td className="p-3 text-gray-400">{p.supervisor}</td>
                        <td className="p-3 text-center font-bold text-[#D69E2E]">{p.faltas}</td>
                        <td className="p-3 text-center font-bold text-[#E53E3E]">{p.dias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {vistaTabla === 'recurrentes' && (
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-[#121212] text-xs uppercase text-[#D69E2E] font-semibold">
                    <tr>
                      <th className="p-3">Colaborador Recurrente</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3 text-center">Meses c/ Faltas</th>
                      <th className="p-3 text-center">Días Acumulados</th>
                      <th className="p-3 text-center">Proyección Anual Estimada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {colaboradoresRecurrentes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-gray-400">
                          No se detectaron colaboradores con ausencias repetidas en múltiples meses.
                        </td>
                      </tr>
                    ) : (
                      colaboradoresRecurrentes.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40">
                          <td className="p-3 font-medium text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#D69E2E] shrink-0" /> {p.nombre}
                          </td>
                          <td className="p-3 text-gray-400">{p.empresa}</td>
                          <td className="p-3 text-gray-400">{p.supervisor}</td>
                          <td className="p-3 text-center font-bold text-[#D69E2E]">{p.cantMeses} meses</td>
                          <td className="p-3 text-center font-bold text-gray-200">{p.totalDias} días</td>
                          <td className="p-3 text-center font-extrabold text-[#E53E3E] bg-[#E53E3E]/10">
                            ~{p.proyectadoAnual} días / año
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {vistaTabla === 'historial' && (
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-[#121212] text-xs uppercase text-gray-400 font-semibold">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Mes</th>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3">Motivo</th>
                      <th className="p-3 text-center">Días</th>
                      <th className="p-3 text-center">Certificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {datosFiltrados.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-800/40">
                        <td className="p-3 text-gray-400">{r.fecha}</td>
                        <td className="p-3 text-gray-300 font-medium uppercase">{r.mes}</td>
                        <td className="p-3 font-medium text-white">{r.nombre}</td>
                        <td className="p-3 text-gray-400">{r.empresa}</td>
                        <td className="p-3 text-gray-400">{r.supervisor}</td>
                        <td className="p-3 text-[#D69E2E]">{r.motivo}</td>
                        <td className="p-3 text-center font-bold text-[#E53E3E]">{r.cantDias}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.certif === 'SI' || r.certif === 'S' ? 'bg-[#C05621]/20 text-[#DD6B20] border border-[#C05621]/40' : 'bg-[#E53E3E]/20 text-[#E53E3E] border border-[#E53E3E]/40'}`}>
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
