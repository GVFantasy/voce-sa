import { state, IDIOMA_MAP, DLABELS } from './state.js';

export function buildHabitsFromCfg() {
  state.userHabits = [];
  const sonoMeta = state.userCfg.sonoMeta || 7;
  state.userHabits.push({ id: 'sono', icon: '🌙', name: `Sono ${sonoMeta}h+`, days: 'todo dia', allDays: true, hasDetail: false });

  const idiomasAtivos = state.userCfg.idiomasAtivos || ['ingles'];
  const idiomaDias = state.userCfg.idiomaDias || [0, 1, 2, 3, 4, 5, 6];
  idiomasAtivos.forEach(id => {
    if (IDIOMA_MAP[id]) {
      const daysLabel = idiomaDias.length === 7 ? 'todo dia' : idiomaDias.map(d => DLABELS[d]).join(', ');
      state.userHabits.push({
        id, icon: IDIOMA_MAP[id].icon, name: IDIOMA_MAP[id].name,
        days: daysLabel, allDays: idiomaDias.length === 7,
        weekdays: idiomaDias.length < 7 ? idiomaDias : undefined,
        hasDetail: true,
        detailOptions: {
          time: ['10min', '15min', '20min', '30min', '45min', '60min'],
          method: ['Podcast', 'Duolingo', 'Shadowing', 'Série', 'Aula', 'Anki', 'Livro'],
        },
      });
    }
  });

  const areas = state.userCfg.areas || ['corpo'];
  if (areas.includes('corpo')) {
    const treinoDias = state.userCfg.treinoDias || [2, 4, 6];
    const daysLabel = treinoDias.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ');
    state.userHabits.push({
      id: 'treino', icon: '🏋️', name: 'Treino', days: daysLabel,
      allDays: false, weekdays: treinoDias, hasDetail: true,
      detailOptions: {
        time: ['30min', '45min', '60min', '90min'],
        method: state.userCfg.exercicios && state.userCfg.exercicios.length
          ? state.userCfg.exercicios
          : ['Academia', 'Corrida', 'Ciclismo'],
      },
    });
  }

  if (areas.includes('mente')) {
    const estudoDias = state.userCfg.estudoDias || [0, 1, 3];
    const daysLabel = estudoDias.map(d => DLABELS[d]).join(', ');
    state.userHabits.push({
      id: 'estudo', icon: '📚', name: 'Estudo', days: daysLabel,
      allDays: false, weekdays: estudoDias, hasDetail: true,
      detailOptions: {
        time: ['30min', '45min', '60min', '90min', '2h'],
        method: ['Livro', 'Curso', 'Vídeo', 'Podcast', 'Prática'],
      },
    });
  }

}
