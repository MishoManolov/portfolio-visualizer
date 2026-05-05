import { usePortfolio } from './hooks/usePortfolio';
import { Header } from './components/Header/Header';
import { TreeView } from './components/TreeView/TreeView';

function App() {
  const { state, dispatch, computedRoot } = usePortfolio();

  function handleToggleMode() {
    dispatch({
      type: 'SET_DISPLAY_MODE',
      mode: state.displayMode === 'relative' ? 'absolute' : 'relative',
    });
  }

  function handleToggleLayout() {
    dispatch({
      type: 'SET_LAYOUT_MODE',
      mode: state.layoutMode === 'vertical' ? 'horizontal' : 'vertical',
    });
  }

  return (
    <>
      <Header
        displayMode={state.displayMode}
        onToggleMode={handleToggleMode}
        layoutMode={state.layoutMode}
        onToggleLayout={handleToggleLayout}
      />
      <main>
        <TreeView
          root={computedRoot}
          displayMode={state.displayMode}
          layoutMode={state.layoutMode}
          activeAddFormNodeId={state.activeAddFormNodeId}
          dispatch={dispatch}
        />
      </main>
    </>
  );
}

export default App;
