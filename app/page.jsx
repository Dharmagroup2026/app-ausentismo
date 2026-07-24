'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Building2, FileText, Upload, Search, ListFilter, Trophy, AlertTriangle, TrendingUp } from 'lucide-react';

const COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#EF4444', '#10B981'];

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

  // Cargar datos guardados previamente en el navegador al abrir la app
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
        // Guardar copia persistente en el navegador
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-blue-500" /> Tablero de Control de Ausentismo
          </h1>
          <p className="text-slate-400 text-sm">Monitoreo en tiempo real de faltas, motivos y proyecciones</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">MES</label>
              <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 uppercase">
                {mesesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">EMPRESA</label>
              <select value={empresaFiltro} onChange={(e) => manejarCambioEmpresa(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
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
            
            <div className="bg-slate-800 p-5 rounded-xl border border-amber-500/40 relative">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Faltas Recurrentes
              </span>
              <p className="text-3xl font-extrabold text-amber-300 mt-1">
                {colaboradoresRecurrentes.length} <span className="text-sm font-normal text-slate-400">personas</span>
              </p>
              
              {colaboradoresRecurrentes.length > 0 && (
                <div className="mt-2 text-xs text-slate-300 border-t border-slate-700/60 pt-2">
                  <span className="font-semibold text-amber-400/90 block mb-1">Colaboradores en riesgo:</span>
                  <div className="max-h-16 overflow-y-auto space-y-0.5 pr-1">
                    {colaboradoresRecurrentes.map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-300">
                        <span className="truncate max-w-[130px]">• {c.nombre}</span>
                        <span className="text-red-400 font-bold shrink-0">{c.totalDias}d ({c.cantMeses}m)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Tabla Dinámica */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {vistaTabla === 'ranking' && <Trophy className="w-4 h-4 text-yellow-500" />}
                {vistaTabla === 'historial' && <ListFilter className="w-4 h-4 text-blue-500" />}
                {vistaTabla === 'recurrentes' && <TrendingUp className="w-4 h-4 text-amber-500" />}
                
                {vistaTabla === 'ranking' && 'Personas con Mayor Ausentismo'}
                {vistaTabla === 'historial' && 'Historial Detallado de Licencias'}
                {vistaTabla === 'recurrentes' && 'Análisis de Recurrencia y Proyección Anual'}
              </h3>
              
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs font-medium">
                <button 
                  onClick={() => setVistaTabla('ranking')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'ranking' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Mayor Ausentismo
                </button>
                <button 
                  onClick={() => setVistaTabla('recurrentes')}
                  className={`px-3 py-1.5 rounded-md transition ${vistaTabla === 'recurrentes' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Recurrentes y Proyectado
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
              {vistaTabla === 'ranking' && (
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
              )}

              {vistaTabla === 'recurrentes' && (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/50 text-xs uppercase text-amber-400 font-semibold">
                    <tr>
                      <th className="p-3">Colaborador Recurrente</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3 text-center">Meses c/ Faltas</th>
                      <th className="p-3 text-center">Días Acumulados</th>
                      <th className="p-3 text-center">Proyección Anual Estimada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {colaboradoresRecurrentes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-slate-400">
                          No se detectaron colaboradores con ausencias repetidas en múltiples meses.
                        </td>
                      </tr>
                    ) : (
                      colaboradoresRecurrentes.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30">
                          <td className="p-3 font-medium text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> {p.nombre}
                          </td>
                          <td className="p-3 text-slate-400">{p.empresa}</td>
                          <td className="p-3 text-slate-400">{p.supervisor}</td>
                          <td className="p-3 text-center font-bold text-amber-300">{p.cantMeses} meses</td>
                          <td className="p-3 text-center font-bold text-slate-200">{p.totalDias} días</td>
                          <td className="p-3 text-center font-extrabold text-red-400 bg-red-950/20">
                            ~{p.proyectadoAnual} días / año
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {vistaTabla === 'historial' && (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold">
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
                  <tbody className="divide-y divide-slate-700/50">
                    {datosFiltrados.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-700/30">
                        <td className="p-3 text-slate-400">{r.fecha}</td>
                        <td className="p-3 text-slate-300 font-medium uppercase">{r.mes}</td>
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
