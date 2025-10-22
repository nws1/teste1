import React, { useState, useEffect } from 'react';
import { Download, FileText, Plus } from 'lucide-react';

/**
 * Componente CNAB 500 completo:
 * - Campos de header editáveis por usuário (originador, data, banco, agência, conta)
 * - Lista dinâmica de detalhes (+ Adicionar Título)
 * - Geração do arquivo .txt com linhas de 500 chars: header, detalhes, trailer
 * - Sequenciais automáticos:
 *    - fileSequence (7 dígitos) persistido em localStorage para usar em header (pos 111-117)
 *    - record sequence (6 dígitos) para cada linha (header = 000001, detalhe = 000002... trailer = última linha)
 */

type Detalhe = {
  id: string;
  tipoJuros: '0' | '2' | '3' | '4' | '5';
  taxaJuros: string; // até 3 dígitos (ex: "100" ou "4")
  cobriga: '1' | '2';
  seuNumero: string; // até 25 alfanum
  valorPago: string; // número (aceita decimais), será convertido para 10 posições (centavos)
  tpMovimento: '01' | '02' | '14';
  numeroDocumento: string; // 10 chars
  dataVencimento: string; // YYYY-MM-DD (input date) -> será convertido para DDMMYY
  valorNominal: string; // número (aceita decimais) -> 13 chars (cents)
  espTitulo: '01' | '60' | '24' | '41';
  dataEmissao: string; // YYYY-MM-DD -> DDMMYY
  tipoPessoaCedente: '01' | '02';
  numeroTermo: string; // 19 chars
  valorAquisicao: string; // number (cents) 13 chars
  tipoPessoaSacado: '01' | '02';
  cpfcnpjSacado: string; // 14 chars
  nomeSacado: string; // 40 chars
  enderecoSacado: string; // 40 chars
  numeroNotaFiscal: string; // 9 chars (315-323) - se vazio zeros
  serieNotaFiscal: string; // 3 chars (324-326)
  cepSacado: string; // 8 chars (327-334)
  nomeCedente: string; // 46? spec asks 335-380 (46 chars)
  cnpjCedente: string; // 14 chars 381-394
};

function zeros(n: number) {
  return '0'.repeat(n);
}
function spaces(n: number) {
  return ' '.repeat(n);
}

const padStart = (s: string, len: number) => s.padStart(len, '0').slice(-len);
const padEnd = (s: string, len: number) => s.padEnd(len, ' ').slice(0, len);

// util para formatar valores monetários para centavos sem separador e com padding
function formatValorParaInteiroStr(valor: string, totalLength: number) {
  if (!valor) return '0'.repeat(totalLength);
  // aceita "123.45" ou "123,45" ou "123"
  const cleaned = valor.replace(',', '.').trim();
  const num = Number(cleaned);
  if (Number.isNaN(num)) return '0'.repeat(totalLength);
  const cents = Math.round(num * 100); // transforma em centavos
  return padStart(String(cents), totalLength);
}

// converte YYYY-MM-DD -> DDMMYY (6 posições)
function dateToDDMMYY(dateStr: string) {
  if (!dateStr) return '000000';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '000000';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return dd + mm + yy;
}

// converte YYYY-MM-DD -> YYYYMMDD (8 posições)
function dateToYYYYMMDD(dateStr: string) {
  if (!dateStr) return '00000000';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '00000000';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yyyy + mm + dd;
}

//Converter visualização do CNPJ/CPF
function formatCpfCnpj(value: string) {
  const onlyNumbers = value.replace(/\D/g, '');

  if (onlyNumbers.length <= 11) {
    // Formata CPF: 000.000.000-00
    return onlyNumbers
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
  } else {
    // Formata CNPJ: 00.000.000/0001-00
    return onlyNumbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
  }
}

export default function Cnab500Page() {
  // header fields (editáveis em tela)
  const [originadorCodigo, setOriginadorCodigo] = useState(''); // pos 27-46 (20) only numbers
  const [originadorNome, setOriginadorNome] = useState(''); // 47-76 (30)
  const [dataArquivo, setDataArquivo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  }); // 95-100 (6?) spec asked habilitar para digitar data do arquivo - we'll store YYYY-MM-DD but write YYYYMMDD pos?
  // spec: 95 a 100 habilite um campo pra digitar com nome de data do arquivo -> positions count 6? they said 95-100 (6) ambiguous;
  // earlier in other fields they used date as 6 (ddmmyy) or 8. To be conservative, we'll write YYYYMM (6) would be odd.
  // We'll write DDMMYY in positions 95-100 (6). Use dateToDDMMYY.

  const [bancoNumero, setBancoNumero] = useState(''); // 118-120 (3)
  const [agencia, setAgencia] = useState(''); // 121-125 (5)
  const [conta, setConta] = useState(''); // 127-138 (12)
  const [digitoConta, setDigitoConta] = useState(''); // 139 (1)

  const [detalhes, setDetalhes] = useState<Detalhe[]>([]);

  // valor compartilhado do Número do Termo de Cessão
  const [numeroTermoGlobal, setNumeroTermoGlobal] = useState('');

  // file sequence persisted (header pos 111-117 -> 7 chars)
  const FILE_SEQ_KEY = 'cnab_file_seq_v1';
  const [fileSeq, setFileSeq] = useState<number>(() => {
    const v = localStorage.getItem(FILE_SEQ_KEY);
    return v ? Number(v) : 1;
  });

  useEffect(() => {
    localStorage.setItem(FILE_SEQ_KEY, String(fileSeq));
  }, [fileSeq]);

  // Helper para formatar número para BRL com vírgula
  function formatBRL(value: number) {
    return (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // helper para criar um novo detalhe padrão
  const novoDetalhe = (): Detalhe => ({
    id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
    tipoJuros: '0',
    taxaJuros: '',
    cobriga: '2',
    seuNumero: '',
    valorPago: '',
    tpMovimento: '01',
    numeroDocumento: '',
    dataVencimento: '',
    valorNominal: '',
    espTitulo: '01',
    dataEmissao: '',
    tipoPessoaCedente: '02',
    numeroTermo: numeroTermoGlobal,
    valorAquisicao: '',
    tipoPessoaSacado: '02',
    cpfcnpjSacado: '',
    nomeSacado: '',
    enderecoSacado: '',
    numeroNotaFiscal: '',
    serieNotaFiscal: '',
    cepSacado: '',
    nomeCedente: '',
    cnpjCedente: '',
  });

  const addDetalhe = () => {
    setDetalhes(prev => [...prev, novoDetalhe()]);
  };
  const removeDetalhe = (id: string) => {
    setDetalhes(prev => prev.filter(d => d.id !== id));
  };
  const updateDetalhe = (id: string, patch: Partial<Detalhe>) => {
    setDetalhes(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));
  };

  // gera o arquivo CNAB 500
  const gerarArquivo = () => {
  const lines: string[] = [];
   // Validação do header
   if (!originadorCodigo) {
     alert("Preencha o CNPJ do Originador");
     return;
   }
   if (!originadorNome) {
     alert("Preencha o Nome do Originador");
     return;
   }

   // Validação de detalhes
  for (let i = 0; i < detalhes.length; i++) {
    const d = detalhes[i];
    if (!d.seuNumero) {
      alert(`Preencha o "Seu Número" do título #${i + 1}`);
      return;
    }
    if (!d.numeroDocumento) {
      alert(`Preencha o "Número do Documento" do título #${i + 1}`);
      return;
    }
    if (!d.dataVencimento) {
      alert(`Preencha a "Data de Vencimento" do título #${i + 1}`);
      return;
    }
    if (!d.valorNominal) {
      alert(`Preencha o "Valor Nominal" do título #${i + 1}`);
      return;
    }
    if (!d.dataEmissao) {
      alert(`Preencha a "Data de Emissão" do título #${i + 1}`);
      return;
    }
    if (!d.numeroTermo) {
      alert(`Preencha o "Número do Termo de Cessão" do título #${i + 1}`);
      return;
    }
    if (!d.valorAquisicao) {
      alert(`Preencha o "Valor de Aquisição" do título #${i + 1}`);
      return;
    }
    if (!d.nomeSacado) {
      alert(`Preencha o "Nome do Sacado" do título #${i + 1}`);
      return;
    }
    if (!d.cpfcnpjSacado) {
      alert(`Preencha o "CPF/CNPJ do Sacado" do título #${i + 1}`);
      return;
    }
    if (!d.cnpjCedente) {
      alert(`Preencha o "CNPJ do Cedente" do título #${i + 1}`);
      return;
    }
    if (!d.nomeCedente) {
      alert(`Preencha o "Nome do Cedente" do título #${i + 1}`);
      return;
    }
  }

    // record sequence starts at 1 for header, increments per line for 6-digit field (495-500)
    let recordSeq = 1;

    // ---------- HEADER ----------
    // positions mapping per spec (we will assemble in order ensuring total length 500)
    // We'll create an array of pieces in sequence and join then pad to 500.
    const headerPieces: string[] = [];

    // pos 1-26 fixed "08REMESSA01COBRANCA" and pad rest of 26? Spec: 1 a 26, manter fixo 08REMESSA01COBRANCA
    headerPieces.push(padEnd('08REMESSA01COBRANCA', 26)); // will be 26

    // 27-46 originador codigo max 20 numbers
    const originadorCodigoNums = (originadorCodigo || '').replace(/\D/g, '').slice(0, 14); // pega só o CNPJ
    headerPieces.push(padStart(originadorCodigoNums, 20)); // preenche com zeros à esquerda para 20 chars

    // 47-76 nome originador 30 chars
    headerPieces.push(padEnd(originadorNome || '', 30));

    // 77-79 fixed "500"
    headerPieces.push(padEnd('500', 3));

    // 80-94 fixed "FIDD" (field 15 chars but put "FIDD" then spaces)
    headerPieces.push(padEnd('FIDD', 15));

    // 95-100 data do arquivo: we'll put DDMMYY (6)
    headerPieces.push(dateToDDMMYY(dataArquivo)); // 6

    // 101-108 em branco (8)
    headerPieces.push(spaces(8));

    // 109-110 fixed "MX" (2)
    headerPieces.push('MX');

    // 111-117 sequencial do arquivo 7 chars (persistido fileSeq)
    const fileSeqStr = String(fileSeq).padStart(7, '0').slice(-7);
    headerPieces.push(fileSeqStr);

    // 118-120 numero do banco (3)
    headerPieces.push(padStart((bancoNumero || '').slice(0, 3).replace(/\D/g, ''), 3));

    // 121-125 agencia (5)
    headerPieces.push(padStart((agencia || '').slice(0, 5).replace(/\D/g, ''), 5));

    // 126 fixo em branco (1)
    headerPieces.push(' ');

    // 127-138 numero da conta corrente (12)
    headerPieces.push(padStart((conta || '').slice(0, 12).replace(/\D/g, ''), 12));

    // 139 digito da conta (1)
    headerPieces.push((digitoConta || ' ').slice(0, 1));

    // 140-494 em branco -> 355 chars
    headerPieces.push(spaces(355));

    // 495-500 sequencial fixo 6 digits (recordSeq for header)
    headerPieces.push(padStart(String(recordSeq), 6));

    // join and ensure length 500
    let headerLine = headerPieces.join('');
    if (headerLine.length !== 500) {
      // If not exact length, pad/truncate
      headerLine = padEnd(headerLine, 500).slice(0, 500);
    }
    lines.push(headerLine);
    recordSeq += 1; // next line sequence

    // ---------- DETALHES ----------
    detalhes.forEach((d, idx) => {
      // build detail piecewise in order according to your spec.
      const parts: string[] = [];

      // pos 1 fixed '1'
      parts.push('1');

      // 2-7 branco (6)
      parts.push(spaces(6));

      // 8 tipo de juros (1)
      parts.push(d.tipoJuros || '0'); // 1 char: '0' = sem indexador, '2', '3', etc.

      // 9-10 em branco (2)
      parts.push(spaces(2));

      // 11-20 taxa de juros 10 chars: user inputs up to 3 digits, then pad with trailing zeros to total 10
      const t = (d.taxaJuros || '').replace(/\D/g, '').slice(0, 3).padStart(3, '0');
      const taxaFormattedTX = (t + '0000000').slice(0, 10); // ex: '1000000000' or '0040000000'
      parts.push(taxaFormattedTX);

      // 21-22 cobrigação (2)
      const cobriga = d.cobriga === '1' ? '01' : '02';
      parts.push(cobriga); // posições 21-22

      // 23-37 preencher zeros (15)
      parts.push(zeros(15));

      // 38-62 seu numero (25) alfanum
      parts.push(padEnd((d.seuNumero || '').slice(0, 25), 25));

      // 63-68 zeros (6)
      parts.push(zeros(6));

      // 69-82 em branco (14)
      parts.push(spaces(14));

      // 83-92 valor pago (10) - convert to cents, padStart 10
      parts.push(formatValorParaInteiroStr(d.valorPago || '', 10));

      // 93-94 em branco (2)
      parts.push(spaces(2));

      // 95-100 usar data do arquivo do header (6) -> DDMMYY
      parts.push(dateToDDMMYY(dataArquivo));

      // 101-108 em branco (8)
      parts.push(spaces(8));

      // 109-110 acao tipo (2)
      parts.push((d.tpMovimento || '01').slice(0, 2));

      // 111-120 numero documento (10)
      parts.push(padEnd((d.numeroDocumento || '').slice(0, 10), 10));

      // 121-126 data de vencimento 6 -> DDMMYY
      parts.push(dateToDDMMYY(d.dataVencimento));

      // 127-139 valor nominal 13 chars (cents)
      parts.push(formatValorParaInteiroStr(d.valorNominal || '', 13));

      // 140-147 zeros (8)
      parts.push(zeros(8));

      // 148-149 tipo documento (2)
      parts.push((d.espTitulo || '01').slice(0, 2));

      // 150 em branco (1)
      parts.push(' ');

      // 151-156 data de emissao 6 -> DDMMYY
      parts.push(dateToDDMMYY(d.dataEmissao));

      // 157-159 zeros (3)
      parts.push(zeros(3));

      // 160-161 tipo pessoa cedente (2)
      parts.push((d.tipoPessoaCedente || '02').slice(0, 2));

      // 162-173 zeros (12)
      parts.push(zeros(12));

      // 174-192 numero termo de cessao (19) -> note spec said 19 chars
      parts.push(padEnd((d.numeroTermo || '').slice(0, 19), 19));

      // 193-205 valor de aquisição 13 chars (cents)
      parts.push(formatValorParaInteiroStr(d.valorAquisicao || '', 13));

      // 206-218 zeros (13)
      parts.push(zeros(13));

      // 219-220 tipo pessoa sacado (2)
      parts.push((d.tipoPessoaSacado || '02').slice(0, 2));

      // 221-234 cpf/cnpj sacado (14)
      parts.push(padStart((d.cpfcnpjSacado || '').replace(/\D/g, '').slice(0, 14), 14));

      // 235-274 nome do sacado (40)
      parts.push(padEnd((d.nomeSacado || '').slice(0, 40), 40));

      // 275-314 endereco completo sacado (40)
      parts.push(padEnd((d.enderecoSacado || '').slice(0, 40), 40));

      // 315-323 numero da nota fiscal (9) - se vazio zeros
      parts.push(padStart((d.numeroNotaFiscal || '').replace(/\D/g, '').slice(0, 9), 9));

      // 324-326 serie nota fiscal (3)
      parts.push(padEnd((d.serieNotaFiscal || '').slice(0, 3), 3));

      // 327-334 cep do sacado (8) or zeros
      parts.push(padStart((d.cepSacado || '').replace(/\D/g, '').slice(0, 8), 8));

      // 335-380 nome do cedente (46)
      parts.push(padEnd((d.nomeCedente || '').slice(0, 46), 46));

      // 381-394 cnpj do cedente (14)
      parts.push(padStart((d.cnpjCedente || '').replace(/\D/g, '').slice(0, 14), 14));

      // 395-430 com zeros (36)
      parts.push(zeros(36));

      // 431-438 em branco (8)
      parts.push(spaces(8));

      // 439-467 com zeros (29)
      parts.push(zeros(29));

      // 468-494 em branco (27)
      parts.push(spaces(27));

      // 495-500 sequencial de registro 6 digits (recordSeq)
      parts.push(padStart(String(recordSeq), 6));

      // join and ensure 500 chars
      let detailLine = parts.join('');
      if (detailLine.length !== 500) {
        detailLine = padEnd(detailLine, 500).slice(0, 500);
      }
      lines.push(detailLine);
      recordSeq += 1;
    });

    // ---------- TRAILER ----------
    const trailerParts: string[] = [];
    // pos 1 fixo '9'
    trailerParts.push('9');

    // 2-494 em branco (493)
    trailerParts.push(spaces(493));

    // 495-500 sequencial final 
    trailerParts.push(padStart(String(recordSeq), 6));

    let trailerLine = trailerParts.join('');
    if (trailerLine.length !== 500) {
      trailerLine = padEnd(trailerLine, 500).slice(0, 500);
    }
    lines.push(trailerLine);

    // incrementa fileSeq para próxima geração (persistido)
    setFileSeq(prev => prev + 1);

    // cria blob e download
    const content = lines.join('\r\n'); // CRLF por compatibilidade bancária
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataFile = dataArquivo.replace(/-/g, '');
    a.href = url;
    a.download = `CNAB500_${dataFile}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // feedback simples
    alert('Arquivo gerado e baixado. Linhas: ' + lines.length);
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-slate-900" />
          <h2 className="text-2xl font-bold text-slate-900">Gerador CNAB 500</h2>
        </div>

        {/* Header editable campos (apenas os necessários) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ do Originador</label>
           <input
             value={originadorCodigo}
             onChange={e => {
               // mantém apenas números
               const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 14); // CNPJ máximo 14 dígitos
               setOriginadorCodigo(onlyNumbers);
             }}
             placeholder="CNPJ"
             className="w-full px-3 py-2 border rounded"
           />
           <p className="text-xs text-slate-500 mt-1">{originadorCodigo.length}/14</p>
          </div>


          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Originador</label>
            <input value={originadorNome} onChange={e => {
                const filtered = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 30); 
                setOriginadorNome(filtered.toUpperCase());
              }}
              placeholder="Razão Social"
              className="w-full px-3 py-2 border rounded"
            />
            <p className="text-xs text-slate-500 mt-1">{originadorNome.length}/30</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data do Arquivo</label>
            <input
              type="date"
              value={dataArquivo}
              onChange={e => setDataArquivo(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código do Banco</label>
            <input
              value={bancoNumero}
              onChange={e => setBancoNumero(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Ex: 341"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
            <input
              value={agencia}
              onChange={e => setAgencia(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Ex: 0001"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Conta Corrente</label>
            <div className="flex gap-2">
              <input
                value={conta}
                onChange={e => setConta(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Nº da conta do Cedente"
                className="w-full px-3 py-2 border rounded"
              />
              <input
                value={digitoConta}
                onChange={e => setDigitoConta(e.target.value.slice(0, 1))}
                placeholder="Dígito"
                className="w-24 px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Detalhes */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Títulos</h3>
            <button
              type="button"
              onClick={addDetalhe}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
              Adicionar Título
            </button>
          </div>

          {detalhes.length === 0 && (
            <div className="text-sm text-slate-500 mb-3">Nenhum título adicionado. Clique em "Adicionar Título".</div>
          )}

          <div className="space-y-4">
            {detalhes.map((d, i) => (
              <div key={d.id} className="border rounded p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-medium">Título #{i + 1}</div>
                  <button
                    onClick={() => removeDetalhe(d.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600">Tipo de Juros</label>
                    <select
                      value={d.tipoJuros}
                      onChange={e => updateDetalhe(d.id, { tipoJuros: e.target.value as any })}
                      className="w-full px-2 py-2 border rounded"
                    >
                      <option value="0">Sem Indexador</option>
                      <option value="2">CDI</option>
                      <option value="3">IPCA-15</option>
                      <option value="4">IPCA</option>
                      <option value="5">IGPM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Taxa Juros (%)</label>
                    <input
                      value={d.taxaJuros}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '').slice(0, 3); // mantém só números e 3 dígitos
                        if (Number(val) > 100) val = '100'; // limita a 100
                        updateDetalhe(d.id, { taxaJuros: val });
                      }}
                      className="w-full px-2 py-2 border rounded font-mono"
                      placeholder="ex: 100, 50, 5" />
                    <p className="text-xs text-slate-400">Apenas se usar indexador.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Cobrigação</label>
                    <select value={d.cobriga} onChange={e => updateDetalhe(d.id, { cobriga: e.target.value as any })} className="w-full px-2 py-2 border rounded">
                      <option value="1">Com Cobrigação</option>
                      <option value="2">Sem Cobrigação</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Seu Número (ID título)</label>
                    <input value={d.seuNumero} onChange={e => updateDetalhe(d.id, { seuNumero: e.target.value.slice(0, 25) })} className="w-full px-2 py-2 border rounded" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Valor Pago</label>
                    <input
                      value={d.valorPago ? formatBRL(Number(d.valorPago)) : ''}
                      onChange={e => {
                        // remove tudo que não é número
                        const onlyNumbers = e.target.value.replace(/\D/g, '');
                        // pega até o limite de 10 dígitos
                        const limited = onlyNumbers.slice(0, 10);
                        // salva no detalhe em centavos
                        updateDetalhe(d.id, { valorPago: limited });
                      }}
                      placeholder="ex: 1.234,56"
                      className="w-full px-2 py-2 border rounded"
                    />
                    <p className="text-xs text-slate-400">Usar apenas em movimentos de baixa.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Tipo Movimento</label>
                    <select value={d.tpMovimento} onChange={e => updateDetalhe(d.id, { tpMovimento: e.target.value as any })} className="w-full px-2 py-2 border rounded">
                      <option value="01">Aquisição</option>
                      <option value="02">Baixa</option>
                      <option value="14">Liquidação parcial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Número do Documento</label>
                    <input value={d.numeroDocumento} onChange={e => updateDetalhe(d.id, { numeroDocumento: e.target.value.slice(0, 10) })} className="w-full px-2 py-2 border rounded" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Data Vencimento</label>
                    <input type="date" value={d.dataVencimento} onChange={e => updateDetalhe(d.id, { dataVencimento: e.target.value })} className="w-full px-2 py-2 border rounded" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Valor Nominal</label>
                    <input
                      value={d.valorNominal ? formatBRL(Number(d.valorNominal)) : ''}
                      onChange={e => {
                        // remove tudo que não é número
                        const onlyNumbers = e.target.value.replace(/\D/g, '');
                        // pega até o limite de 10 dígitos
                        const limited = onlyNumbers.slice(0, 10);
                        // salva no detalhe em centavos
                        updateDetalhe(d.id, { valorNominal: limited });
                      }}
                      placeholder="ex: 1.234,56"
                      className="w-full px-2 py-2 border rounded"
                    />
                    <p className="text-xs text-slate-400">Inserir apenas números.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Espécie de Título</label>
                    <select value={d.espTitulo} onChange={e => updateDetalhe(d.id, { espTitulo: e.target.value as any })} className="w-full px-2 py-2 border rounded">
                      <option value="01">Duplicata</option>
                      <option value="60">Contrato</option>
                      <option value="24">Nota comercial</option>
                      <option value="41">CCB digital</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Data Emissão</label>
                    <input type="date" value={d.dataEmissao} onChange={e => updateDetalhe(d.id, { dataEmissao: e.target.value })} className="w-full px-2 py-2 border rounded" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Número do Termo de Cessão</label>
                    <input
                      value={numeroTermoGlobal}
                      onChange={e => {
                        const val = e.target.value.slice(0, 19); // limita a 19 chars
                        setNumeroTermoGlobal(val);
                        // atualiza todos os detalhes com esse valor
                        setDetalhes(prev => prev.map(t => ({ ...t, numeroTermo: val })));
                      }}
                      className="w-full px-2 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Valor Aquisição</label>
                    <input
                      value={d.valorAquisicao ? formatBRL(Number(d.valorAquisicao)) : ''}
                      onChange={e => {
                        // remove tudo que não é número
                        const onlyNumbers = e.target.value.replace(/\D/g, '');
                        // pega até o limite de 10 dígitos
                        const limited = onlyNumbers.slice(0, 10);
                        // salva no detalhe em centavos
                        updateDetalhe(d.id, { valorAquisicao: limited });
                      }}
                      placeholder="ex: 1.234,56"
                      className="w-full px-2 py-2 border rounded"
                    />
                    <p className="text-xs text-slate-400">Inserir apenas números.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Tipo Pessoa Sacado</label>
                    <select value={d.tipoPessoaSacado} onChange={e => updateDetalhe(d.id, { tipoPessoaSacado: e.target.value as any })} className="w-full px-2 py-2 border rounded">
                      <option value="01">Sacado PF</option>
                      <option value="02">Sacado PJ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">CPF/CNPJ Sacado</label>
                    <input value={formatCpfCnpj(d.cpfcnpjSacado)} onChange={e => {
                      // apenas salva números puros no state
                      const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 14);
                      updateDetalhe(d.id, { cpfcnpjSacado: onlyNumbers });
                    }}
                    className="w-full px-2 py-2 border rounded"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-600">Nome Sacado</label>
                    <input value={d.nomeSacado} onChange={e => {
                        const onlyLetters = e.target.value.replace(/[^a-zA-Z\s]/g, '').slice(0, 40);
                        updateDetalhe(d.id, { nomeSacado: onlyLetters.toUpperCase() });
                      }}
                      className="w-full px-2 py-2 border rounded"
                      />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-600">Endereço Sacado</label>
                    <input value={d.enderecoSacado} onChange={e => {
                       const filtered = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 40); // 40 chars máximo
                       updateDetalhe(d.id, { enderecoSacado: filtered.toUpperCase() });
                     }}
                     className="w-full px-2 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Número NF</label>
                    <input value={d.numeroNotaFiscal} onChange={e => updateDetalhe(d.id, { numeroNotaFiscal: e.target.value.replace(/\D/g, '').slice(0, 9) })} className="w-full px-2 py-2 border rounded" />
                    <p className="text-xs text-slate-400">Apenas para Duplicatas.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Série NF</label>
                    <input value={d.serieNotaFiscal} onChange={e => updateDetalhe(d.id, { serieNotaFiscal: e.target.value.slice(0, 3) })} className="w-full px-2 py-2 border rounded" />
                    <p className="text-xs text-slate-400">Apenas para Duplicatas.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">CEP Sacado</label>
                    <input value={d.cepSacado} onChange={e => updateDetalhe(d.id, { cepSacado: e.target.value.replace(/\D/g, '').slice(0, 8) })} className="w-full px-2 py-2 border rounded" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Nome Cedente</label>
                    <input value={d.nomeCedente} onChange={e => {
                        const onlyLetters = e.target.value.replace(/[^a-zA-Z\s]/g, '').slice(0, 46);
                        updateDetalhe(d.id, { nomeCedente: onlyLetters.toUpperCase() });
                      }}
                      className="w-full px-2 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">CNPJ Cedente</label>
                    <input value={formatCpfCnpj(d.cnpjCedente)}
                      onChange={e => {
                        // salva apenas números puros no state
                        const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 14);
                        updateDetalhe(d.id, { cnpjCedente: onlyNumbers });
                      }}
                      className="w-full px-2 py-2 border rounded"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-slate-500">Utilize o botão ao lado para gerar o arquivo CNAB.</div>
          <button onClick={gerarArquivo} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500">
            <Download className="w-4 h-4" />
            Gerar Arquivo CNAB 500
          </button>
        </div>
      </div>
    </div>
  );
}
