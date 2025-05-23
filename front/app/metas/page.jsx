'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function MetasPage() {
  return (
    <ProtectedRoute>
      <Metas />
    </ProtectedRoute>
  );
}

function Metas() {
  const [metas, setMetas] = useState([]);
  const auth = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: '',
    valor_objetivo: '',
    valor_inicial: '',
    prazo: new Date().toISOString().split('T')[0],
    categoria_id: '',
    usuario_id: auth?.user?.id || null
  });
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [transacoesPorMeta, setTransacoesPorMeta] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [metaAtiva, setMetaAtiva] = useState(null);
  const [notificacao, setNotificacao] = useState({ visivel: false, tipo: '', mensagem: '' });

  useEffect(() => {
    if (auth?.user) {
      buscarMetas();
      buscarCategorias();
    }
  }, [auth?.user]);

  const buscarCategorias = async () => {
    try {
      if (!auth?.user) {
        console.error('Usuário não autenticado');
        return;
      }
      
      const response = await auth.authFetch('http://localhost:3001/categorias');
      if (response.ok) {
        const data = await response.json();
        // Garantir que data seja sempre um array
        setCategorias(Array.isArray(data) ? data : (data.data ? data.data : []));
      } else {
        console.error(`Erro ao buscar categorias: ${response.status} ${response.statusText}`);
        setCategorias([]);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      setCategorias([]);
    }
  };

  const buscarMetas = async () => {
    try {
      if (!auth?.user) {
        console.error('Usuário não autenticado');
        router.push('/login');
        return;
      }
      console.log('Buscando metas para usuário:', auth.user.id);
      
      // Usar o endpoint correto
      const response = await auth.authFetch('http://localhost:3001/metas');
      console.log('Resposta da API:', response);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos:', data);
        
        if (data.status === 'success' && Array.isArray(data.data)) {
          console.log('Metas encontradas:', data.data);
          setMetas(data.data);
        } else if (Array.isArray(data)) {
          // Caso a API retorne diretamente um array
          console.log('Metas encontradas (formato alternativo):', data);
          setMetas(data);
        } else {
          console.error('Formato de dados inválido:', data);
          setMetas([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta:', errorData);
        setMetas([]);
        // Remover o alerta para evitar mensagens irritantes para o usuário
        console.error(`Erro ao buscar metas: ${errorData.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      setMetas([]);
      // Remover o alerta para evitar mensagens irritantes para o usuário
      console.error(`Erro ao buscar metas: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!auth?.user) {
        console.error('Usuário não autenticado');
        router.push('/login');
        return;
      }

      // Validar campos obrigatórios
      if (!formData.nome || !formData.valor_objetivo || !formData.valor_inicial || !formData.prazo) {
        alert('Por favor, preencha todos os campos obrigatórios: Nome, Valor Objetivo, Valor Inicial e Prazo');
        return;
      }

      // Validar valor objetivo
      const valorObjetivo = parseFloat(formData.valor_objetivo);
      if (isNaN(valorObjetivo) || valorObjetivo <= 0) {
        alert('O valor objetivo deve ser um número positivo');
        return;
      }

      // Validar valor inicial
      const valorInicial = parseFloat(formData.valor_inicial);
      if (isNaN(valorInicial) || valorInicial < 0) {
        alert('O valor inicial deve ser um número não negativo');
        return;
      }

      // Validar prazo
      const dataPrazo = new Date(formData.prazo);
      const hoje = new Date();
      if (dataPrazo < hoje) {
        alert('O prazo deve ser uma data futura');
        return;
      }

      // Logs para debug de autenticação
      console.log('Auth user:', auth.user);
      console.log('Auth user ID:', auth.user.id);
      
      // Garantir que o ID do usuário seja um número
      const userId = parseInt(auth.user.id);
      
      // Prepare os dados da meta de acordo com o esperado pela API
      const metaData = {
        ...formData,
        usuario_id: userId,
        valor_objetivo: valorObjetivo,
        valor_inicial: valorInicial,
        nome: formData.nome.trim()
      };
      
      console.log('Dados da meta a ser enviada:', metaData);
      
      let response;
      
      if (editando) {
        try {
          // Verificar se a meta pertence ao usuário atual
          const metaAtual = metas.find(m => m.id === editando);
          if (!metaAtual) {
            alert('Meta não encontrada.');
            return;
          }
          
          // Verificar se o usuário atual é o dono da meta
          const metaUserId = String(metaAtual.usuario_id);
          const currentUserId = String(auth.user.id);
          
          console.log('ID do usuário da meta:', metaUserId, 'tipo:', typeof metaUserId);
          console.log('ID do usuário atual:', currentUserId, 'tipo:', typeof currentUserId);
          
          if (metaUserId !== currentUserId) {
            alert('Você não tem permissão para atualizar esta meta. Você só pode atualizar suas próprias metas.');
            return;
          }
          
          // Garantir que estamos usando o ID do usuário original da meta
          const updateData = {
            ...metaData,
            usuario_id: metaAtual.usuario_id // Mantenha o ID original do criador da meta
          };
          
          // Endpoint com parâmetro userId explícito
          const url = `http://localhost:3001/metas/${editando}?userId=${auth.user.id}`;
          
          response = await auth.authFetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          });
        } catch (error) {
          console.error('Erro ao verificar permissões ou atualizar meta:', error);
          alert('Erro ao atualizar meta: ' + error.message);
          return;
        }
      } else {
        response = await auth.authFetch('http://localhost:3001/metas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaData),
        });
      }
      
      console.log('Resposta da API:', response);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Dados da resposta:', responseData);
        
        setFormData({
          nome: '',
          valor_objetivo: '',
          valor_inicial: '',
          prazo: new Date().toISOString().split('T')[0],
          usuario_id: auth.user.id
        });
        setEditando(null);
        setMostrarForm(false);
        
        // Mostrar notificação de sucesso
        mostrarNotificacao('sucesso', editando ? 'Meta atualizada com sucesso!' : 'Meta criada com sucesso!');
        
        // Buscar metas atualizadas
        await buscarMetas();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Erro ao salvar meta: ${response.status} ${response.statusText}`, errorData);
        mostrarNotificacao('erro', errorData.message || 'Erro ao salvar meta. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert('Erro ao salvar meta. Por favor, tente novamente.');
    }
  };

  const handleEditar = (meta) => {
    setFormData({
      nome: meta.nome,
      valor_objetivo: meta.valor_objetivo,
      valor_inicial: meta.valor_inicial,
      prazo: meta.prazo ? meta.prazo.split('T')[0] : '',
      categoria_id: meta.categoria_id || '',
      usuario_id: meta.usuario_id
    });
    setEditando(meta.id);
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        if (!auth?.user) {
          console.error('Usuário não autenticado');
          router.push('/login');
          return;
        }
        
        const response = await auth.authFetch(`http://localhost:3001/metas/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          buscarMetas();
          mostrarNotificacao('sucesso', 'Meta excluída com sucesso!');
        } else {
          // Tratar o erro de forma mais robusta
          let mensagemErro = 'Erro ao excluir meta';
          try {
            const errorData = await response.json();
            mensagemErro = errorData.message || 'Erro ao excluir meta';
          } catch (e) {
            console.error('Erro ao processar resposta:', e);
          }
          
          console.error(`Erro ao excluir meta: ${response.status} ${response.statusText}`);
          mostrarNotificacao('erro', mensagemErro);
        }
      } catch (error) {
        console.error('Erro ao excluir meta:', error);
        alert('Erro ao excluir meta: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const calcularProgresso = (meta) => {
    const valorAtual = parseFloat(meta.valor_inicial || 0);
    const valorObjetivo = parseFloat(meta.valor_objetivo || 1);
    return Math.min((valorAtual / valorObjetivo) * 100, 100);
  };

  const toggleDetalhes = (metaId) => {
    setMetaAtiva(metaAtiva === metaId ? null : metaId);
  };

  const buscarTransacoesDaMeta = async (metaId) => {
    try {
      if (!auth?.user) {
        console.error('Usuário não autenticado');
        router.push('/login');
        return;
      }
      
      // Mostra notificação de carregamento
      mostrarNotificacao('sucesso', 'Buscando transações da meta...');
      
      const response = await auth.authFetch(`http://localhost:3001/transacoes?meta_id=${metaId}&userId=${auth.user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data && Array.isArray(data.data.transacoes)) {
          // Filtrar para garantir que apenas transações desta meta sejam incluídas
          const transacoesFiltradas = data.data.transacoes.filter(
            transacao => transacao.meta_id === metaId || parseInt(transacao.meta_id) === parseInt(metaId)
          );
          
          // Atualizar o estado com as transações filtradas desta meta
          setTransacoesPorMeta(prev => ({
            ...prev,
            [metaId]: transacoesFiltradas
          }));
          
          // Mostrar mensagem de sucesso com o número de transações encontradas
          mostrarNotificacao('sucesso', `${transacoesFiltradas.length} transações encontradas`);
        } else {
          console.error('Formato de resposta inválido:', data);
          setTransacoesPorMeta(prev => ({
            ...prev,
            [metaId]: []
          }));
          mostrarNotificacao('erro', 'Não foi possível obter as transações');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Erro ao buscar transações da meta: ${errorData.message || response.statusText}`);
        setTransacoesPorMeta(prev => ({
          ...prev,
          [metaId]: []
        }));
        mostrarNotificacao('erro', 'Erro ao buscar transações');
      }
    } catch (error) {
      console.error('Erro ao buscar transações da meta:', error);
      try {
        setTransacoesPorMeta(prev => ({
          ...prev,
          [metaId]: []
        }));
        mostrarNotificacao('erro', `Erro: ${error.message || 'Falha ao buscar transações'}`);
      } catch (stateError) {
        console.error('Erro ao atualizar estado:', stateError);
      }
    }
  };

  // Função para mostrar notificação
  const mostrarNotificacao = (tipo, mensagem) => {
    setNotificacao({ visivel: true, tipo, mensagem });
    setTimeout(() => {
      setNotificacao({ visivel: false, tipo: '', mensagem: '' });
    }, 5000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen font-sans max-w-7xl mx-auto ">
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        {/* Componente de Notificação */}
        {notificacao.visivel && (
          <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg z-50 flex items-center animate-fadeIn ${
            notificacao.tipo === 'sucesso' ? 'bg-emerald-100 border-l-4 border-emerald-500 text-emerald-700' : 
            'bg-red-100 border-l-4 border-red-500 text-red-700'
          }`}>
            {notificacao.tipo === 'sucesso' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span>{notificacao.mensagem}</span>
            <button 
              onClick={() => setNotificacao({ ...notificacao, visivel: false })}
              className="ml-3 text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {/* Header com design sofisticado */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-8 rounded-2xl shadow-lg border-l-4 border-emerald-600 transition-all duration-300 transform hover:shadow-xl">
          <div className="flex items-center">
            <div className="bg-emerald-100 p-3 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Minhas Metas Financeiras</h1>
              <p className="text-gray-500">Acompanhe e gerencie seus objetivos financeiros com eficiência</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setFormData({
                nome: '',
                valor_objetivo: '',
                valor_inicial: '',
                prazo: new Date().toISOString().split('T')[0],
                categoria_id: '',
                usuario_id: auth?.user?.id || null
              });
              setEditando(null);
              setMostrarForm(!mostrarForm);
            }}
            className={`mt-6 md:mt-0 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 flex items-center ${mostrarForm 
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-xl'}`}
          >
            {mostrarForm ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Meta
              </>
            )}
          </button>
        </div>
        
        {/* Resumo das metas - Design aprimorado */}
        {metas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8 mb-10 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-l-4 border-emerald-600 transition-transform hover:scale-105">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-emerald-800">Total de Metas</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">{metas.length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border-l-4 border-teal-600 transition-transform hover:scale-105">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-teal-100 rounded-lg mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-teal-800">Metas em Andamento</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {metas.filter(m => {
                    const progresso = calcularProgresso(m);
                    return progresso < 100;
                  }).length}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-l-4 border-emerald-600 transition-transform hover:scale-105">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-emerald-800">Metas Concluídas</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  {metas.filter(m => {
                    const progresso = calcularProgresso(m);
                    return progresso >= 100;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Formulário Melhorado com ícones e design mais sofisticado */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border border-gray-200 transition-all duration-300 transform hover:shadow-xl animate-fadeIn">
            <h2 className="text-2xl font-semibold mb-8 text-gray-800 border-b pb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {editando ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                )}
              </svg>
              {editando ? 'Editar Meta' : 'Criar Nova Meta'}
            </h2>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Nome da Meta
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ex: Viagem para Europa"
                  required
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Categoria
                </label>
                <select
                  name="categoria_id"
                  value={formData.categoria_id}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Selecione uma categoria (opcional)</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Valor Objetivo (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">R$</span>
                  </div>
                  <input
                    type="number"
                    name="valor_objetivo"
                    value={formData.valor_objetivo}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Valor Inicial (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">R$</span>
                  </div>
                  <input
                    type="number"
                    name="valor_inicial"
                    value={formData.valor_inicial}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Prazo
                </label>
                <input
                  type="date"
                  name="prazo"
                  value={formData.prazo}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end mt-6">
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center transform hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editando ? 'Atualizar Meta' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Estado vazio melhorado */}
        {metas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-200">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-50 p-5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">Você ainda não tem metas cadastradas</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Crie sua primeira meta financeira para começar a acompanhar seu progresso e alcançar seus objetivos.</p>
            <button 
              onClick={() => setMostrarForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium px-8 py-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center mx-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar Primeira Meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {metas.map((meta, index) => {
              const progresso = calcularProgresso(meta);
              const dataAtual = new Date();
              const dataPrazo = new Date(meta.prazo);
              const diasRestantes = Math.ceil((dataPrazo - dataAtual) / (1000 * 60 * 60 * 24));
              
              // Determinar status da meta com cores mais sofisticadas
              let statusClasse = '';
              let statusTexto = '';
              let statusBg = '';
              let progressoBg = '';
              let statusIcon = null;
              
              if (progresso >= 100) {
                statusClasse = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                statusTexto = 'Concluída';
                statusBg = 'bg-emerald-100';
                progressoBg = 'bg-emerald-500';
                statusIcon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                );
              } else if (diasRestantes < 0) {
                statusClasse = 'bg-red-50 text-red-800 border-red-200';
                statusTexto = 'Prazo expirado';
                statusBg = 'bg-red-100';
                progressoBg = 'bg-red-500';
                statusIcon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                );
              } else if (diasRestantes <= 7) {
                statusClasse = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                statusTexto = 'Prazo próximo';
                statusBg = 'bg-yellow-100';
                progressoBg = 'bg-yellow-500';
                statusIcon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                );
              } else {
                statusClasse = 'bg-teal-50 text-teal-800 border-teal-200';
                statusTexto = 'Em andamento';
                statusBg = 'bg-teal-100';
                progressoBg = 'bg-teal-500';
                statusIcon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                );
              }
              
              return (
                <div key={meta.id} className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 transform hover:-translate-y-2 ${statusBg} bg-opacity-5 animate-fadeIn`} style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-5">
                      <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">{meta.nome}</h3>
                      <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusClasse} border shadow-sm flex items-center`}>
                        {statusIcon}
                        {statusTexto}
                      </span>
                    </div>
                    
                    <div className="space-y-6 mb-6">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Progresso
                          </span>
                          <span className="font-bold text-gray-800">{progresso.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${progressoBg} transition-all duration-1000 ease-in-out`}
                            style={{ width: `${progresso}%`, transition: 'width 1.5s ease-in-out' }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-xs font-medium text-gray-500">Valor Atual</p>
                          </div>
                          <p className="text-lg font-bold text-gray-800">{formatarMoeda(meta.valor_inicial)}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                          <div className="flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <p className="text-xs font-medium text-gray-500">Objetivo</p>
                          </div>
                          <p className="text-lg font-bold text-gray-800">{formatarMoeda(meta.valor_objetivo)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center bg-gray-50 p-3 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {diasRestantes < 0 
                              ? 'Prazo expirado há ' + Math.abs(diasRestantes) + ' dias'
                              : diasRestantes === 0 
                                ? 'Prazo vence hoje!' 
                                : 'Prazo: ' + diasRestantes + ' dias restantes'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(meta.prazo).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4 border-t border-gray-200">
                      <button 
                        onClick={() => toggleDetalhes(meta.id)} 
                        className="text-emerald-600 hover:text-emerald-800 text-sm font-medium flex items-center transition-colors duration-200"
                      >
                        {metaAtiva === meta.id ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Ocultar Detalhes
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Ver Detalhes
                          </>
                        )}
                      </button>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditar(meta)} 
                          className="text-teal-600 hover:text-teal-800 transition-colors duration-200 p-2 hover:bg-teal-50 rounded-full"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button 
                          onClick={() => handleExcluir(meta.id)} 
                          className="text-red-600 hover:text-red-800 transition-colors duration-200 p-2 hover:bg-red-50 rounded-full"
                          title="Excluir"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Seção de detalhes melhorada */}
                    {metaAtiva === meta.id && (
                      <div className="mt-6 pt-5 border-t border-gray-200 animate-fadeIn">
                        <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Detalhes da Meta
                        </h4>
                        <div className="bg-gray-50 p-5 rounded-xl shadow-sm text-sm">
                          <p className="mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="font-medium text-gray-700 min-w-28">Categoria: </span>
                            <span className="text-gray-600 bg-white px-3 py-1 rounded-lg ml-2">
                              {meta.categoria_id 
                                ? categorias.find(c => c.id === meta.categoria_id)?.nome || 'Não especificada'
                                : 'Não especificada'}
                            </span>
                          </p>
                        </div>
                        
                        <div className="mt-5">
                          <button
                            onClick={() => buscarTransacoesDaMeta(meta.id)}
                            className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Ver Transações Relacionadas
                          </button>
                          
                          {/* Exibição das transações relacionadas */}
                          {transacoesPorMeta[meta.id] && (
                            <div className="mt-4 bg-gradient-to-br from-green-50 to-white p-5 rounded-xl shadow-md border border-green-100 animate-fadeIn">
                              <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                Transações desta Meta: {meta.nome}
                              </h5>
                              
                              {transacoesPorMeta[meta.id].length === 0 ? (
                                <div className="text-center py-6 bg-white rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                  </svg>
                                  <p className="text-sm text-gray-500 italic">
                                    Nenhuma transação encontrada para esta meta.
                                  </p>
                                  <button 
                                    onClick={() => router.push('/transacoes')}
                                    className="mt-3 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                                  >
                                    Criar uma transação
                                  </button>
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-100">
                                  <table className="min-w-full text-sm bg-white">
                                    <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      <tr>
                                        <th className="px-4 py-3 text-left">Descrição</th>
                                        <th className="px-4 py-3 text-left">Valor</th>
                                        <th className="px-4 py-3 text-left">Data</th>
                                        <th className="px-4 py-3 text-left">Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {transacoesPorMeta[meta.id].map((transacao) => (
                                        <tr key={transacao.id} className="hover:bg-green-50 transition-colors">
                                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                                            {transacao.descricao}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                              transacao.tipo === 'entrada' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {formatarMoeda(transacao.valor)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                            {new Date(transacao.data).toLocaleDateString('pt-BR')}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                              transacao.tipo === 'entrada' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              
                              {/* Resumo das transações */}
                              {transacoesPorMeta[meta.id]?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 bg-white p-4 rounded-lg shadow-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-xs text-gray-500 mb-1">Total de transações</p>
                                      <p className="text-lg font-bold text-gray-800">{transacoesPorMeta[meta.id].length}</p>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-xs text-gray-500 mb-1">Valor total</p>
                                      <p className="text-lg font-bold text-emerald-600">
                                        {formatarMoeda(
                                          transacoesPorMeta[meta.id].reduce((total, transacao) => 
                                            total + parseFloat(transacao.valor || 0), 0)
                                        )}
                                      </p>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <p className="text-xs text-gray-500 mb-1">Última transação</p>
                                      <p className="text-lg font-medium text-gray-800">
                                        {transacoesPorMeta[meta.id].length > 0 
                                          ? new Date(
                                              Math.max(
                                                ...transacoesPorMeta[meta.id].map(t => new Date(t.data))
                                              )
                                            ).toLocaleDateString('pt-BR')
                                          : '-'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}