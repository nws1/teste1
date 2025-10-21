import { useState } from 'react';
import { Download, FileText } from 'lucide-react';

export default function Cnab444Generator() {
  const [formData, setFormData] = useState({
    codigoBanco: '',
    loteServico: '',
    tipoRegistro: '0',
    operacao: 'C',
    tipoServico: '01',
    formaLancamento: '01',
    layoutLote: '045',
    nomeEmpresa: '',
    numeroInscricao: '',
    agencia: '',
    conta: '',
    digitoConta: '',
    nomeArquivo: '',
    dataGeracao: new Date().toISOString().split('T')[0],
    horaGeracao: new Date().toTimeString().split(' ')[0].substring(0, 5),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const generateCnab444 = () => {
    const header = [
      formData.codigoBanco.padEnd(3, '0'),
      formData.loteServico.padStart(4, '0'),
      formData.tipoRegistro,
      formData.operacao,
      formData.tipoServico.padStart(2, '0'),
      formData.formaLancamento.padStart(2, '0'),
      formData.layoutLote,
      ' ',
      '2',
      formData.numeroInscricao.padStart(14, '0'),
      formData.nomeEmpresa.padEnd(30, ' '),
      ' '.repeat(40),
      formData.agencia.padStart(5, '0'),
      ' ',
      formData.conta.padStart(12, '0'),
      formData.digitoConta,
      ' ',
      formData.nomeArquivo.padEnd(8, ' '),
      formData.dataGeracao.replace(/-/g, ''),
      formData.horaGeracao.replace(/:/g, ''),
    ].join('');

    const content = header.padEnd(444, ' ');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cnab444_${formData.dataGeracao.replace(/-/g, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-slate-900" />
          <h2 className="text-2xl font-bold text-slate-900">Gerador CNAB 444</h2>
        </div>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Código do Banco *
              </label>
              <input
                type="text"
                name="codigoBanco"
                value={formData.codigoBanco}
                onChange={handleChange}
                maxLength={3}
                placeholder="Ex: 237"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lote de Serviço *
              </label>
              <input
                type="text"
                name="loteServico"
                value={formData.loteServico}
                onChange={handleChange}
                maxLength={4}
                placeholder="Ex: 0001"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Registro *
              </label>
              <select
                name="tipoRegistro"
                value={formData.tipoRegistro}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                <option value="0">0 - Header</option>
                <option value="1">1 - Detalhe</option>
                <option value="9">9 - Trailer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Operação *
              </label>
              <select
                name="operacao"
                value={formData.operacao}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                <option value="C">C - Crédito</option>
                <option value="D">D - Débito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Serviço *
              </label>
              <input
                type="text"
                name="tipoServico"
                value={formData.tipoServico}
                onChange={handleChange}
                maxLength={2}
                placeholder="Ex: 01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Forma de Lançamento *
              </label>
              <input
                type="text"
                name="formaLancamento"
                value={formData.formaLancamento}
                onChange={handleChange}
                maxLength={2}
                placeholder="Ex: 01"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                maxLength={30}
                placeholder="Nome completo da empresa"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número de Inscrição (CNPJ/CPF) *
              </label>
              <input
                type="text"
                name="numeroInscricao"
                value={formData.numeroInscricao}
                onChange={handleChange}
                maxLength={14}
                placeholder="Apenas números"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Layout do Lote *
              </label>
              <input
                type="text"
                name="layoutLote"
                value={formData.layoutLote}
                onChange={handleChange}
                maxLength={3}
                placeholder="Ex: 045"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Agência *
              </label>
              <input
                type="text"
                name="agencia"
                value={formData.agencia}
                onChange={handleChange}
                maxLength={5}
                placeholder="Ex: 01234"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conta *
              </label>
              <input
                type="text"
                name="conta"
                value={formData.conta}
                onChange={handleChange}
                maxLength={12}
                placeholder="Número da conta"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dígito da Conta *
              </label>
              <input
                type="text"
                name="digitoConta"
                value={formData.digitoConta}
                onChange={handleChange}
                maxLength={1}
                placeholder="X"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome do Arquivo *
              </label>
              <input
                type="text"
                name="nomeArquivo"
                value={formData.nomeArquivo}
                onChange={handleChange}
                maxLength={8}
                placeholder="Ex: REM001"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data de Geração *
              </label>
              <input
                type="date"
                name="dataGeracao"
                value={formData.dataGeracao}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hora de Geração *
              </label>
              <input
                type="time"
                name="horaGeracao"
                value={formData.horaGeracao}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <button
            type="button"
            onClick={generateCnab444}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Gerar Arquivo CNAB 444
          </button>
        </form>
      </div>
    </div>
  );
}
