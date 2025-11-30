// src/components/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Card,
  CardContent,
  CardActions,
  Collapse,
  Checkbox,
} from '@mui/material';
import {
  Logout,
  Add,
  Delete,
  Edit,
  Upload,
  People,
  Refresh,
  Settings,
  ViewList,
  ViewModule,
  Search,
  FilterList,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Pause,
  Stop,
  Restore,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import * as XLSX from 'xlsx';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState(0);
  
  // Player data - separated by type
  const [auctionPoolPlayers, setAuctionPoolPlayers] = useState([]);
  const [retainedPlayers, setRetainedPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  
  const [auctionRules, setAuctionRules] = useState({
    rtm_enabled_globally: false,
    default_rtm_cards: 2,
    default_max_overseas: 8,
    default_starting_purse: 100,
  });
  const [auctionStatus, setAuctionStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Auction Pool - Add Player Dialog
  const [openAuctionPoolDialog, setOpenAuctionPoolDialog] = useState(false);
  const [editingAuctionPlayer, setEditingAuctionPlayer] = useState(null);
  const [auctionPlayerForm, setAuctionPlayerForm] = useState({
    name: '',
    category: 'batter',
    country: 'india',
    base_price: 2.00,
  });

  // Retained Pool - Add Player Dialog
  const [openRetainedDialog, setOpenRetainedDialog] = useState(false);
  const [editingRetainedPlayer, setEditingRetainedPlayer] = useState(null);
  const [retainedPlayerForm, setRetainedPlayerForm] = useState({
    name: '',
    category: 'batter',
    country: 'india',
    base_price: 2.00,
    team_id: '',
    retention_price: 12.00,
  });

  // Bulk upload - Auction Pool
  const [uploadAuctionFile, setUploadAuctionFile] = useState(null);
  const [uploadingAuction, setUploadingAuction] = useState(false);
  const [showAuctionUploadHints, setShowAuctionUploadHints] = useState(false);

  // Bulk upload - Retentions
  const [uploadRetentionFile, setUploadRetentionFile] = useState(null);
  const [uploadingRetentions, setUploadingRetentions] = useState(false);
  const [showRetentionUploadHints, setShowRetentionUploadHints] = useState(false);

  // View mode for both sections
  const [auctionPoolViewMode, setAuctionPoolViewMode] = useState('list'); // 'list' or 'grid'
  const [retainedViewMode, setRetainedViewMode] = useState('list'); // 'list' or 'grid'

  // Filters - Auction Pool
  const [auctionSearchQuery, setAuctionSearchQuery] = useState('');
  const [auctionCategoryFilter, setAuctionCategoryFilter] = useState('all');
  const [auctionCountryFilter, setAuctionCountryFilter] = useState('all');
  const [auctionStatusFilter, setAuctionStatusFilter] = useState('all');

  // Filters - Retained Pool
  const [retainedSearchQuery, setRetainedSearchQuery] = useState('');
  const [retainedCategoryFilter, setRetainedCategoryFilter] = useState('all');
  const [retainedCountryFilter, setRetainedCountryFilter] = useState('all');
  const [retainedTeamFilter, setRetainedTeamFilter] = useState('all');

  // Start New Auction Dialog
  const [showNewAuctionDialog, setShowNewAuctionDialog] = useState(false);
  const [newAuctionOptions, setNewAuctionOptions] = useState({
    keep_sold: true,
    keep_retained: true,
    reset_teams: false,
  });
  const [startingNewAuction, setStartingNewAuction] = useState(false);

  // Team configuration
  const [editingTeam, setEditingTeam] = useState(null);
  const [showTeamConfigDialog, setShowTeamConfigDialog] = useState(false);
  const [teamConfigForm, setTeamConfigForm] = useState({
    max_overseas: 8,
    rtm_enabled: true,
    rtm_cards: 2,
  });
  const [savingRules, setSavingRules] = useState(false);

  // Fetch auction status
  const fetchAuctionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_state')
        .select('auction_status')
        .single();

      if (error) throw error;
      setAuctionStatus(data?.auction_status || 'not_started');
    } catch (error) {
      console.error('Error fetching auction status:', error);
    }
  };

  // Fetch auction rules
  const fetchAuctionRules = async () => {
    try {
      const { data, error } = await supabase.rpc('get_auction_rules');
      if (error) throw error;
      if (data && data.length > 0) {
        setAuctionRules(data[0]);
      }
    } catch (error) {
      console.error('Error fetching auction rules:', error);
    }
  };

  // Fetch players (separated by type)
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Fetch auction pool players
      const { data: auctionData, error: auctionError } = await supabase
        .from('players')
        .select('*')
        .eq('status', 'auction_pool')
        .order('name', { ascending: true });

      if (auctionError) throw auctionError;
      setAuctionPoolPlayers(auctionData || []);

      // Fetch retained players
      const { data: retainedData, error: retainedError } = await supabase
        .from('players')
        .select(`
          *,
          teams (team_name, team_code)
        `)
        .eq('is_retained', true)
        .order('name', { ascending: true });

      if (retainedError) throw retainedError;
      setRetainedPlayers(retainedData || []);

    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('team_name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
    fetchAuctionRules();
    fetchAuctionStatus();

    // Refresh auction status every 5 seconds
    const interval = setInterval(fetchAuctionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter auction pool players
  const getFilteredAuctionPlayers = () => {
    let filtered = [...auctionPoolPlayers];

    if (auctionSearchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(auctionSearchQuery.toLowerCase())
      );
    }

    if (auctionCategoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === auctionCategoryFilter);
    }

    if (auctionCountryFilter !== 'all') {
      filtered = filtered.filter(p => p.country === auctionCountryFilter);
    }

    if (auctionStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === auctionStatusFilter);
    }

    return filtered;
  };

  // Filter retained players
  const getFilteredRetainedPlayers = () => {
    let filtered = [...retainedPlayers];

    if (retainedSearchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(retainedSearchQuery.toLowerCase())
      );
    }

    if (retainedCategoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === retainedCategoryFilter);
    }

    if (retainedCountryFilter !== 'all') {
      filtered = filtered.filter(p => p.country === retainedCountryFilter);
    }

    if (retainedTeamFilter !== 'all') {
      filtered = filtered.filter(p => p.team_id === retainedTeamFilter);
    }

    return filtered;
  };
  // ============================================
  // AUCTION POOL HANDLERS
  // ============================================

  // Open add auction pool player dialog
  const handleOpenAuctionPoolDialog = (player = null) => {
    if (player) {
      setEditingAuctionPlayer(player);
      setAuctionPlayerForm({
        name: player.name,
        category: player.category,
        country: player.country,
        base_price: player.base_price,
      });
    } else {
      setEditingAuctionPlayer(null);
      setAuctionPlayerForm({
        name: '',
        category: 'batter',
        country: 'india',
        base_price: 2.00,
      });
    }
    setOpenAuctionPoolDialog(true);
  };

  // Save auction pool player
  const handleSaveAuctionPlayer = async () => {
    setError('');
    setSuccess('');

    try {
      if (editingAuctionPlayer) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            name: auctionPlayerForm.name,
            category: auctionPlayerForm.category,
            country: auctionPlayerForm.country,
            base_price: auctionPlayerForm.base_price,
          })
          .eq('id', editingAuctionPlayer.id);

        if (error) throw error;
        setSuccess('Player updated successfully!');
      } else {
        // Add new player
        const { error } = await supabase
          .from('players')
          .insert({
            name: auctionPlayerForm.name,
            category: auctionPlayerForm.category,
            country: auctionPlayerForm.country,
            base_price: auctionPlayerForm.base_price,
            status: 'auction_pool',
            is_retained: false,
          });

        if (error) throw error;
        setSuccess('Player added to auction pool!');
      }

      setOpenAuctionPoolDialog(false);
      fetchPlayers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving player:', error);
      setError(error.message || 'Failed to save player');
    }
  };

  // Delete auction pool player
  const handleDeleteAuctionPlayer = async (playerId) => {
    if (!window.confirm('Delete this player?')) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;
      setSuccess('Player deleted!');
      fetchPlayers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting player:', error);
      setError('Failed to delete player');
    }
  };

  // Handle auction pool file upload
  const handleAuctionFileUpload = (e) => {
    setUploadAuctionFile(e.target.files[0]);
  };

  // Bulk upload auction pool players
  const handleBulkUploadAuction = async () => {
    if (!uploadAuctionFile) return;

    setUploadingAuction(true);
    setError('');
    setSuccess('');

    try {
      const data = await uploadAuctionFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const players = jsonData.map(row => ({
        name: row.name,
        category: row.category,
        country: row.country,
        base_price: parseFloat(row.base_price),
        status: 'auction_pool',
        is_retained: false,
      }));

      const { error } = await supabase.from('players').insert(players);
      if (error) throw error;

      setSuccess(`Successfully uploaded ${players.length} players to auction pool!`);
      setUploadAuctionFile(null);
      fetchPlayers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error uploading auction pool:', error);
      setError('Failed to upload players. Check Excel format.');
    } finally {
      setUploadingAuction(false);
    }
  };

  // ============================================
  // RETAINED POOL HANDLERS
  // ============================================

  // Open add retained player dialog
  const handleOpenRetainedDialog = (player = null) => {
    if (player) {
      setEditingRetainedPlayer(player);
      setRetainedPlayerForm({
        name: player.name,
        category: player.category,
        country: player.country,
        base_price: player.base_price || 2.00,
        team_id: player.team_id,
        retention_price: player.retained_price,
      });
    } else {
      setEditingRetainedPlayer(null);
      setRetainedPlayerForm({
        name: '',
        category: 'batter',
        country: 'india',
        base_price: 2.00,
        team_id: '',
        retention_price: 12.00,
      });
    }
    setOpenRetainedDialog(true);
  };

  // Save retained player (using new SQL function)
  const handleSaveRetainedPlayer = async () => {
    setError('');
    setSuccess('');

    try {
      if (editingRetainedPlayer) {
        // Update existing retained player
        const { error } = await supabase
          .from('players')
          .update({
            name: retainedPlayerForm.name,
            category: retainedPlayerForm.category,
            country: retainedPlayerForm.country,
            base_price: retainedPlayerForm.base_price,
            team_id: retainedPlayerForm.team_id,
            retained_price: retainedPlayerForm.retention_price,
          })
          .eq('id', editingRetainedPlayer.id);

        if (error) throw error;
        setSuccess('Retained player updated!');
      } else {
        // Add new retained player using SQL function
        const team = teams.find(t => t.id === retainedPlayerForm.team_id);
        
        const { data, error } = await supabase.rpc('add_retained_player', {
          player_name: retainedPlayerForm.name,
          player_category: retainedPlayerForm.category,
          player_country: retainedPlayerForm.country,
          player_base_price: retainedPlayerForm.base_price,
          team_code_input: team.team_code,
          retention_price: retainedPlayerForm.retention_price,
        });

        if (error) throw error;
        setSuccess(data[0]?.message || 'Retained player added!');
      }

      setOpenRetainedDialog(false);
      fetchPlayers();
      fetchTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving retained player:', error);
      setError(error.message || 'Failed to save retained player');
    }
  };

  // Delete retained player
  const handleDeleteRetainedPlayer = async (playerId) => {
    if (!window.confirm('Delete this retained player? This will NOT update team stats automatically.')) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;
      setSuccess('Retained player deleted!');
      fetchPlayers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting player:', error);
      setError('Failed to delete player');
    }
  };

  // Handle retention file upload
  const handleRetentionFileUpload = (e) => {
    setUploadRetentionFile(e.target.files[0]);
  };

  // Bulk upload retentions
  const handleBulkUploadRetentions = async () => {
    if (!uploadRetentionFile) return;

    setUploadingRetentions(true);
    setError('');
    setSuccess('');

    try {
      const data = await uploadRetentionFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Convert to JSONB format for SQL function
      const playersData = jsonData.map(row => ({
        name: row.name,
        team_code: row.team_code,
        category: row.category,
        country: row.country,
        base_price: row.base_price ? parseFloat(row.base_price) : 2.0,
        retained_price: parseFloat(row.retained_price),
      }));

      const { data: result, error } = await supabase.rpc('bulk_import_retained_players', {
        players_data: playersData,
      });

      if (error) throw error;

      setSuccess(result[0]?.message || `Successfully imported ${result[0]?.imported_count} retained players!`);
      setUploadRetentionFile(null);
      fetchPlayers();
      fetchTeams();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error uploading retentions:', error);
      setError('Failed to upload retentions. Check Excel format.');
    } finally {
      setUploadingRetentions(false);
    }
  };

  // ============================================
  // AUCTION CONTROLS HANDLERS
  // ============================================

  // Pause auction
  const handlePauseAuction = async () => {
    try {
      const { data, error } = await supabase.rpc('pause_auction');
      if (error) throw error;
      setSuccess('Auction paused!');
      fetchAuctionStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error pausing auction:', error);
      setError('Failed to pause auction');
    }
  };

  // Resume auction
  const handleResumeAuction = async () => {
    try {
      const { data, error } = await supabase.rpc('resume_auction');
      if (error) throw error;
      setSuccess('Auction resumed!');
      fetchAuctionStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error resuming auction:', error);
      setError('Failed to resume auction');
    }
  };

  // End auction
  const handleEndAuction = async () => {
    if (!window.confirm('End the auction permanently? This cannot be undone.')) return;

    try {
      const { data, error } = await supabase.rpc('end_auction');
      if (error) throw error;

      if (data && data.length > 0) {
        setSuccess(`Auction ended! ${data[0].total_sold} players sold, ${data[0].total_unsold} unsold.`);
      }
      fetchAuctionStatus();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error ending auction:', error);
      setError('Failed to end auction');
    }
  };

  // Start new auction
  const handleStartNewAuction = async () => {
    setStartingNewAuction(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.rpc('start_new_auction', {
        keep_sold_players: newAuctionOptions.keep_sold,
        keep_retained_players: newAuctionOptions.keep_retained,
        reset_teams: newAuctionOptions.reset_teams,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setSuccess(`${result.message}\n\nDeleted: ${result.details.deleted_auction_pool} auction pool, ${result.details.deleted_sold} sold, ${result.details.deleted_retained} retained`);
        setShowNewAuctionDialog(false);
        fetchPlayers();
        fetchTeams();
        fetchAuctionStatus();
        setTimeout(() => setSuccess(''), 8000);
      }
    } catch (error) {
      console.error('Error starting new auction:', error);
      setError(error.message || 'Failed to start new auction');
    } finally {
      setStartingNewAuction(false);
    }
  };

  // ============================================
  // TEAM CONFIGURATION HANDLERS
  // ============================================

  const handleOpenTeamConfig = (team) => {
    setEditingTeam(team);
    setTeamConfigForm({
      max_overseas: team.max_overseas_override || 8,
      rtm_enabled: team.rtm_enabled !== false,
      rtm_cards: team.rtm_cards || 2,
    });
    setShowTeamConfigDialog(true);
  };

  const handleSaveTeamConfig = async () => {
    if (!editingTeam) return;

    try {
      const { data, error } = await supabase.rpc('update_team_configuration', {
        team_id_input: editingTeam.id,
        new_max_overseas: teamConfigForm.max_overseas,
        new_rtm_enabled: teamConfigForm.rtm_enabled,
        new_rtm_cards: teamConfigForm.rtm_cards,
      });

      if (error) throw error;

      setSuccess('Team configuration updated!');
      setShowTeamConfigDialog(false);
      fetchTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating team config:', error);
      setError('Failed to update team configuration');
    }
  };

  const handleSaveAuctionRules = async () => {
    setSavingRules(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.rpc('update_auction_rules', {
        new_rtm_enabled: auctionRules.rtm_enabled_globally,
        new_default_rtm_cards: auctionRules.default_rtm_cards,
        new_default_max_overseas: auctionRules.default_max_overseas,
        new_default_starting_purse: auctionRules.default_starting_purse,
      });

      if (error) throw error;

      setSuccess('Auction settings saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving auction rules:', error);
      setError('Failed to save auction settings');
    } finally {
      setSavingRules(false);
    }
  };
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 0,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <People sx={{ fontSize: 48, color: 'white' }} />
              <div>
                <Typography variant="h4" fontWeight="700" color="white">
                  Admin Dashboard
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Manage Players, Teams & Auction
                </Typography>
              </div>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              {/* Auction Status Badge */}
              <Chip
                label={
                  auctionStatus === 'active' ? '🟢 LIVE' :
                  auctionStatus === 'paused' ? '⏸️ PAUSED' :
                  auctionStatus === 'completed' ? '✅ ENDED' :
                  '⚪ NOT STARTED'
                }
                sx={{
                  bgcolor: 
                    auctionStatus === 'active' ? '#4CAF50' :
                    auctionStatus === 'paused' ? '#FF9800' :
                    auctionStatus === 'completed' ? '#2196F3' :
                    '#9E9E9E',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  fetchPlayers();
                  fetchTeams();
                  fetchAuctionRules();
                  fetchAuctionStatus();
                }}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Logout />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Paper>

      {/* Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Messages */}
          {success && (
            <Alert severity="success" onClose={() => setSuccess('')} sx={{ whiteSpace: 'pre-line' }}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Paper elevation={0} sx={{ borderRadius: 2 }}>
            <Tabs 
              value={currentTab} 
              onChange={(e, v) => setCurrentTab(v)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Tab label="Player Management" />
              <Tab label="Team Management" />
              <Tab label="⚙️ Auction Settings" />
              <Tab label="🎮 Auction Controls" />
            </Tabs>

            {/* TAB 1: PLAYER MANAGEMENT */}
            <TabPanel value={currentTab} index={0}>
              <Stack spacing={4}>
                {/* ============================================ */}
                {/* SECTION A: AUCTION POOL PLAYERS */}
                {/* ============================================ */}
                <Paper sx={{ p: 3, bgcolor: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)' }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom color="primary.main">
                    📊 AUCTION POOL PLAYERS
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total: {auctionPoolPlayers.length} players
                  </Typography>

                  {/* Actions */}
                  <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2, mb: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleOpenAuctionPoolDialog()}
                    >
                      Add Player
                    </Button>

                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleAuctionFileUpload}
                      style={{ display: 'none' }}
                      id="auction-pool-upload"
                    />
                    <label htmlFor="auction-pool-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<Upload />}
                      >
                        Choose Excel File
                      </Button>
                    </label>

                    {uploadAuctionFile && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleBulkUploadAuction}
                        disabled={uploadingAuction}
                        startIcon={uploadingAuction ? <CircularProgress size={20} color="inherit" /> : <Upload />}
                      >
                        {uploadingAuction ? 'Uploading...' : `Upload ${uploadAuctionFile.name}`}
                      </Button>
                    )}

                    <IconButton
                      color="primary"
                      onClick={() => setShowAuctionUploadHints(!showAuctionUploadHints)}
                    >
                      {showAuctionUploadHints ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Stack>

                  {/* Upload Hints */}
                  <Collapse in={showAuctionUploadHints}>
                    <Alert severity="info" onClose={() => setShowAuctionUploadHints(false)} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                        📋 Excel Format for Auction Pool:
                      </Typography>
                      <Typography variant="body2" component="div">
                        <strong>Required Columns (exact names):</strong>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          <li><code>name</code> - Player name</li>
                          <li><code>category</code> - wicketkeeper / batter / bowler / allrounder</li>
                          <li><code>country</code> - india / overseas</li>
                          <li><code>base_price</code> - In Crores (e.g., 2.0)</li>
                        </ul>
                        <strong>✅ Tips:</strong> First row must be headers • No empty rows • Supported: .xlsx, .xls, .csv
                      </Typography>
                    </Alert>
                  </Collapse>

                  {/* Filters & View Toggle */}
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          placeholder="Search players..."
                          value={auctionSearchQuery}
                          onChange={(e) => setAuctionSearchQuery(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search />
                              </InputAdornment>
                            ),
                          }}
                          size="small"
                        />
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={auctionCategoryFilter}
                            label="Category"
                            onChange={(e) => setAuctionCategoryFilter(e.target.value)}
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="wicketkeeper">Wicketkeeper</MenuItem>
                            <MenuItem value="batter">Batter</MenuItem>
                            <MenuItem value="bowler">Bowler</MenuItem>
                            <MenuItem value="allrounder">All-rounder</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Country</InputLabel>
                          <Select
                            value={auctionCountryFilter}
                            label="Country"
                            onChange={(e) => setAuctionCountryFilter(e.target.value)}
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="india">India</MenuItem>
                            <MenuItem value="overseas">Overseas</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={auctionStatusFilter}
                            label="Status"
                            onChange={(e) => setAuctionStatusFilter(e.target.value)}
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="auction_pool">Auction Pool</MenuItem>
                            <MenuItem value="unsold">Unsold</MenuItem>
                            <MenuItem value="discarded">Discarded</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <ToggleButtonGroup
                          value={auctionPoolViewMode}
                          exclusive
                          onChange={(e, newMode) => newMode && setAuctionPoolViewMode(newMode)}
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="list">
                            <ViewList sx={{ mr: 1 }} /> List
                          </ToggleButton>
                          <ToggleButton value="grid">
                            <ViewModule sx={{ mr: 1 }} /> Grid
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Auction Pool Players - List/Grid View */}
                  {auctionPoolViewMode === 'list' ? (
                    // LIST VIEW
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell><strong>Country</strong></TableCell>
                            <TableCell><strong>Base Price</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getFilteredAuctionPlayers().length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} align="center">
                                <Typography color="text.secondary">No players in auction pool</Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            getFilteredAuctionPlayers().map((player) => (
                              <TableRow key={player.id} hover>
                                <TableCell>{player.name}</TableCell>
                                <TableCell>
                                  <Chip label={player.category} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={player.country.toUpperCase()} 
                                    size="small"
                                    color={player.country === 'india' ? 'success' : 'secondary'}
                                  />
                                </TableCell>
                                <TableCell>₹{player.base_price} Cr</TableCell>
                                <TableCell>
                                  <Chip label={player.status} size="small" color="primary" />
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1}>
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={() => handleOpenAuctionPoolDialog(player)}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      color="error"
                                      onClick={() => handleDeleteAuctionPlayer(player.id)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    // GRID VIEW
                    <Grid container spacing={2}>
                      {getFilteredAuctionPlayers().length === 0 ? (
                        <Grid item xs={12}>
                          <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No players in auction pool</Typography>
                          </Paper>
                        </Grid>
                      ) : (
                        getFilteredAuctionPlayers().map((player) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={player.id}>
                            <Card
                              sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: 3,
                                }
                              }}
                            >
                              <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" gutterBottom align="center">
                                  {player.name}
                                </Typography>
                                
                                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                                  <Chip label={player.category} size="small" />
                                  <Chip 
                                    label={player.country.toUpperCase()} 
                                    color={player.country === 'india' ? 'success' : 'secondary'}
                                    size="small"
                                  />
                                </Stack>
                                
                                <Typography variant="h6" color="primary" align="center" sx={{ mb: 1 }}>
                                  Base: ₹{player.base_price} Cr
                                </Typography>
                                
                                <Chip 
                                  label={player.status} 
                                  size="small"
                                  color="primary"
                                  sx={{ width: '100%' }}
                                />
                              </CardContent>
                              
                              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleOpenAuctionPoolDialog(player)}
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDeleteAuctionPlayer(player.id)}
                                >
                                  <Delete />
                                </IconButton>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))
                      )}
                    </Grid>
                  )}
                </Paper>
                {/* ============================================ */}
                {/* SECTION B: RETAINED PLAYERS */}
                {/* ============================================ */}
                <Paper sx={{ p: 3, bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom color="success.main">
                    🏆 RETAINED PLAYERS
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total: {retainedPlayers.length} players (across all teams)
                  </Typography>

                  {/* Actions */}
                  <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2, mb: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Add />}
                      onClick={() => handleOpenRetainedDialog()}
                    >
                      Add Retained Player
                    </Button>

                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleRetentionFileUpload}
                      style={{ display: 'none' }}
                      id="retention-upload"
                    />
                    <label htmlFor="retention-upload">
                      <Button
                        variant="outlined"
                        color="success"
                        component="span"
                        startIcon={<Upload />}
                      >
                        Choose Excel File
                      </Button>
                    </label>

                    {uploadRetentionFile && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleBulkUploadRetentions}
                        disabled={uploadingRetentions}
                        startIcon={uploadingRetentions ? <CircularProgress size={20} color="inherit" /> : <Upload />}
                      >
                        {uploadingRetentions ? 'Uploading...' : `Upload ${uploadRetentionFile.name}`}
                      </Button>
                    )}

                    <IconButton
                      color="success"
                      onClick={() => setShowRetentionUploadHints(!showRetentionUploadHints)}
                    >
                      {showRetentionUploadHints ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Stack>

                  {/* Upload Hints */}
                  <Collapse in={showRetentionUploadHints}>
                    <Alert severity="success" onClose={() => setShowRetentionUploadHints(false)} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                        📋 Excel Format for Retentions:
                      </Typography>
                      <Typography variant="body2" component="div">
                        <strong>Required Columns (exact names):</strong>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          <li><code>name</code> - Player name</li>
                          <li><code>team_code</code> - csk / mi / rcb / kkr / dc / pbks / rr / srh / gt / lsg</li>
                          <li><code>category</code> - wicketkeeper / batter / bowler / allrounder</li>
                          <li><code>country</code> - india / overseas</li>
                          <li><code>retained_price</code> - In Crores (e.g., 12.0)</li>
                        </ul>
                        <strong>✅ Tips:</strong> First row must be headers • No empty rows • Supported: .xlsx, .xls, .csv
                      </Typography>
                    </Alert>
                  </Collapse>

                  {/* Filters & View Toggle */}
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          placeholder="Search players..."
                          value={retainedSearchQuery}
                          onChange={(e) => setRetainedSearchQuery(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search />
                              </InputAdornment>
                            ),
                          }}
                          size="small"
                        />
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={retainedCategoryFilter}
                            label="Category"
                            onChange={(e) => setRetainedCategoryFilter(e.target.value)}
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="wicketkeeper">Wicketkeeper</MenuItem>
                            <MenuItem value="batter">Batter</MenuItem>
                            <MenuItem value="bowler">Bowler</MenuItem>
                            <MenuItem value="allrounder">All-rounder</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Country</InputLabel>
                          <Select
                            value={retainedCountryFilter}
                            label="Country"
                            onChange={(e) => setRetainedCountryFilter(e.target.value)}
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="india">India</MenuItem>
                            <MenuItem value="overseas">Overseas</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Team</InputLabel>
                          <Select
                            value={retainedTeamFilter}
                            label="Team"
                            onChange={(e) => setRetainedTeamFilter(e.target.value)}
                          >
                            <MenuItem value="all">All Teams</MenuItem>
                            {teams.map(team => (
                              <MenuItem key={team.id} value={team.id}>
                                {team.team_code.toUpperCase()}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} md={3}>
                        <ToggleButtonGroup
                          value={retainedViewMode}
                          exclusive
                          onChange={(e, newMode) => newMode && setRetainedViewMode(newMode)}
                          size="small"
                          fullWidth
                        >
                          <ToggleButton value="list">
                            <ViewList sx={{ mr: 1 }} /> List
                          </ToggleButton>
                          <ToggleButton value="grid">
                            <ViewModule sx={{ mr: 1 }} /> Grid
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Retained Players - List/Grid View */}
                  {retainedViewMode === 'list' ? (
                    // LIST VIEW
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell><strong>Country</strong></TableCell>
                            <TableCell><strong>Team</strong></TableCell>
                            <TableCell><strong>Retention Price</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getFilteredRetainedPlayers().length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} align="center">
                                <Typography color="text.secondary">No retained players</Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            getFilteredRetainedPlayers().map((player) => (
                              <TableRow key={player.id} hover>
                                <TableCell>{player.name}</TableCell>
                                <TableCell>
                                  <Chip label={player.category} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={player.country.toUpperCase()} 
                                    size="small"
                                    color={player.country === 'india' ? 'success' : 'secondary'}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={player.teams?.team_code?.toUpperCase() || 'N/A'} 
                                    size="small"
                                    color="primary"
                                  />
                                </TableCell>
                                <TableCell>₹{player.retained_price} Cr</TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1}>
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={() => handleOpenRetainedDialog(player)}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      color="error"
                                      onClick={() => handleDeleteRetainedPlayer(player.id)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    // GRID VIEW
                    <Grid container spacing={2}>
                      {getFilteredRetainedPlayers().length === 0 ? (
                        <Grid item xs={12}>
                          <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No retained players</Typography>
                          </Paper>
                        </Grid>
                      ) : (
                        getFilteredRetainedPlayers().map((player) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={player.id}>
                            <Card
                              sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: 3,
                                }
                              }}
                            >
                              <CardContent sx={{ flexGrow: 1 }}>
                                <Box sx={{ mb: 2, textAlign: 'center' }}>
                                  <Chip 
                                    label={player.teams?.team_code?.toUpperCase() || 'N/A'} 
                                    color="primary"
                                    size="large"
                                  />
                                </Box>

                                <Typography variant="h6" gutterBottom align="center">
                                  {player.name}
                                </Typography>
                                
                                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                                  <Chip label={player.category} size="small" />
                                  <Chip 
                                    label={player.country.toUpperCase()} 
                                    color={player.country === 'india' ? 'success' : 'secondary'}
                                    size="small"
                                  />
                                </Stack>
                                
                                <Typography variant="h6" color="success.main" align="center" sx={{ mb: 1 }}>
                                  Retained: ₹{player.retained_price} Cr
                                </Typography>
                              </CardContent>
                              
                              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleOpenRetainedDialog(player)}
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDeleteRetainedPlayer(player.id)}
                                >
                                  <Delete />
                                </IconButton>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))
                      )}
                    </Grid>
                  )}
                </Paper>
              </Stack>
            </TabPanel>

            {/* TAB 2: TEAM MANAGEMENT */}
            <TabPanel value={currentTab} index={1}>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Team Overview
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Team</strong></TableCell>
                      <TableCell><strong>Purse</strong></TableCell>
                      <TableCell><strong>Squad</strong></TableCell>
                      <TableCell><strong>Overseas</strong></TableCell>
                      <TableCell><strong>RTM Cards</strong></TableCell>
                      <TableCell><strong>RTM Enabled</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id} hover>
                        <TableCell>
                          <Chip label={team.team_code.toUpperCase()} color="primary" />
                          <Typography variant="body2">{team.team_name}</Typography>
                        </TableCell>
                        <TableCell>₹{team.current_purse} Cr</TableCell>
                        <TableCell>{team.squad_size}/25</TableCell>
                        <TableCell>{team.os_count}/8</TableCell>
                        <TableCell>{team.rtm_cards}</TableCell>
                        <TableCell>
                          {team.rtm_enabled !== false ? '✅' : '❌'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<Settings />}
                            onClick={() => handleOpenTeamConfig(team)}
                          >
                            Config
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* TAB 3: AUCTION SETTINGS */}
            <TabPanel value={currentTab} index={2}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  ⚙️ Global Auction Settings
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Stack spacing={3}>
                  <TextField
                    label="Default Starting Purse (Crores)"
                    type="number"
                    value={auctionRules.default_starting_purse}
                    onChange={(e) => setAuctionRules({ ...auctionRules, default_starting_purse: parseFloat(e.target.value) })}
                    fullWidth
                  />

                  <TextField
                    label="Default Max Overseas Players"
                    type="number"
                    value={auctionRules.default_max_overseas}
                    onChange={(e) => setAuctionRules({ ...auctionRules, default_max_overseas: parseInt(e.target.value) })}
                    fullWidth
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={auctionRules.rtm_enabled_globally}
                        onChange={(e) => setAuctionRules({ ...auctionRules, rtm_enabled_globally: e.target.checked })}
                      />
                    }
                    label="Enable RTM (Right to Match) Globally"
                  />

                  {auctionRules.rtm_enabled_globally && (
                    <TextField
                      label="Default RTM Cards per Team"
                      type="number"
                      value={auctionRules.default_rtm_cards}
                      onChange={(e) => setAuctionRules({ ...auctionRules, default_rtm_cards: parseInt(e.target.value) })}
                      fullWidth
                    />
                  )}

                  <Button
                    variant="contained"
                    onClick={handleSaveAuctionRules}
                    disabled={savingRules}
                  >
                    {savingRules ? 'Saving...' : 'Save Settings'}
                  </Button>
                </Stack>
              </Paper>
            </TabPanel>

            {/* TAB 4: AUCTION CONTROLS */}
            <TabPanel value={currentTab} index={3}>
              <Stack spacing={3}>
                {/* Current Status */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    🎮 Auction Status & Controls
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  <Alert 
                    severity={
                      auctionStatus === 'active' ? 'success' :
                      auctionStatus === 'paused' ? 'warning' :
                      auctionStatus === 'completed' ? 'info' :
                      'default'
                    }
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h5" fontWeight="700">
                      Current Status: {auctionStatus.toUpperCase().replace('_', ' ')}
                    </Typography>
                  </Alert>

                  {/* Controls based on status */}
                  {auctionStatus === 'active' && (
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<Pause />}
                        onClick={handlePauseAuction}
                      >
                        Pause Auction
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<Stop />}
                        onClick={handleEndAuction}
                      >
                        End Auction
                      </Button>
                    </Stack>
                  )}

                  {auctionStatus === 'paused' && (
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<PlayArrow />}
                        onClick={handleResumeAuction}
                      >
                        Resume Auction
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<Stop />}
                        onClick={handleEndAuction}
                      >
                        End Auction
                      </Button>
                    </Stack>
                  )}

                  {auctionStatus === 'completed' && (
                    <Box>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                          ✅ Auction has been completed!
                        </Typography>
                        <Typography variant="body2">
                          You can start a new auction by clicking the button below.
                        </Typography>
                      </Alert>

                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<Restore />}
                        onClick={() => setShowNewAuctionDialog(true)}
                      >
                        🔄 Start New Auction
                      </Button>
                    </Box>
                  )}

                  {auctionStatus === 'not_started' && (
                    <Alert severity="info">
                      <Typography variant="body1">
                        Auction has not started yet. Please use the auctioneer dashboard to begin.
                      </Typography>
                    </Alert>
                  )}
                </Paper>
              </Stack>
            </TabPanel>
          </Paper>
          {/* ============================================ */}
          {/* DIALOG: ADD/EDIT AUCTION POOL PLAYER */}
          {/* ============================================ */}
          <Dialog 
            open={openAuctionPoolDialog} 
            onClose={() => setOpenAuctionPoolDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingAuctionPlayer ? '✏️ Edit Player' : '➕ Add Player to Auction Pool'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Player Name"
                  fullWidth
                  required
                  value={auctionPlayerForm.name}
                  onChange={(e) => setAuctionPlayerForm({ ...auctionPlayerForm, name: e.target.value })}
                />

                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={auctionPlayerForm.category}
                    label="Category"
                    onChange={(e) => setAuctionPlayerForm({ ...auctionPlayerForm, category: e.target.value })}
                  >
                    <MenuItem value="wicketkeeper">Wicketkeeper</MenuItem>
                    <MenuItem value="batter">Batter</MenuItem>
                    <MenuItem value="bowler">Bowler</MenuItem>
                    <MenuItem value="allrounder">All-rounder</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Country</InputLabel>
                  <Select
                    value={auctionPlayerForm.country}
                    label="Country"
                    onChange={(e) => setAuctionPlayerForm({ ...auctionPlayerForm, country: e.target.value })}
                  >
                    <MenuItem value="india">India</MenuItem>
                    <MenuItem value="overseas">Overseas</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Base Price (Crores)"
                  type="number"
                  fullWidth
                  required
                  value={auctionPlayerForm.base_price}
                  onChange={(e) => setAuctionPlayerForm({ ...auctionPlayerForm, base_price: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAuctionPoolDialog(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                onClick={handleSaveAuctionPlayer}
                disabled={!auctionPlayerForm.name}
              >
                {editingAuctionPlayer ? 'Update' : 'Add to Pool'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ============================================ */}
          {/* DIALOG: ADD/EDIT RETAINED PLAYER */}
          {/* ============================================ */}
          <Dialog 
            open={openRetainedDialog} 
            onClose={() => setOpenRetainedDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingRetainedPlayer ? '✏️ Edit Retained Player' : '🏆 Add Retained Player'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Player Name"
                  fullWidth
                  required
                  value={retainedPlayerForm.name}
                  onChange={(e) => setRetainedPlayerForm({ ...retainedPlayerForm, name: e.target.value })}
                />

                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={retainedPlayerForm.category}
                    label="Category"
                    onChange={(e) => setRetainedPlayerForm({ ...retainedPlayerForm, category: e.target.value })}
                  >
                    <MenuItem value="wicketkeeper">Wicketkeeper</MenuItem>
                    <MenuItem value="batter">Batter</MenuItem>
                    <MenuItem value="bowler">Bowler</MenuItem>
                    <MenuItem value="allrounder">All-rounder</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Country</InputLabel>
                  <Select
                    value={retainedPlayerForm.country}
                    label="Country"
                    onChange={(e) => setRetainedPlayerForm({ ...retainedPlayerForm, country: e.target.value })}
                  >
                    <MenuItem value="india">India</MenuItem>
                    <MenuItem value="overseas">Overseas</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Base Price (Crores)"
                  type="number"
                  fullWidth
                  value={retainedPlayerForm.base_price}
                  onChange={(e) => setRetainedPlayerForm({ ...retainedPlayerForm, base_price: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText="Optional - for reference only"
                />

                <FormControl fullWidth required>
                  <InputLabel>Team (Which team retains)</InputLabel>
                  <Select
                    value={retainedPlayerForm.team_id}
                    label="Team (Which team retains)"
                    onChange={(e) => setRetainedPlayerForm({ ...retainedPlayerForm, team_id: e.target.value })}
                  >
                    {teams.map(team => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.team_name} ({team.team_code.toUpperCase()})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Retention Price (Crores)"
                  type="number"
                  fullWidth
                  required
                  value={retainedPlayerForm.retention_price}
                  onChange={(e) => setRetainedPlayerForm({ ...retainedPlayerForm, retention_price: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenRetainedDialog(false)}>Cancel</Button>
              <Button 
                variant="contained"
                color="success"
                onClick={handleSaveRetainedPlayer}
                disabled={!retainedPlayerForm.name || !retainedPlayerForm.team_id}
              >
                {editingRetainedPlayer ? 'Update' : 'Add Retained'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ============================================ */}
          {/* DIALOG: START NEW AUCTION */}
          {/* ============================================ */}
          <Dialog
            open={showNewAuctionDialog}
            onClose={() => !startingNewAuction && setShowNewAuctionDialog(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              🔄 Start New Auction
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Alert severity="warning">
                  <Typography variant="body1" fontWeight="600">
                    ⚠️ WARNING: This will prepare the system for a new auction.
                  </Typography>
                  <Typography variant="body2">
                    Current auction status: <strong>{auctionStatus.toUpperCase()}</strong>
                  </Typography>
                </Alert>

                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    What to KEEP?
                  </Typography>
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newAuctionOptions.keep_sold}
                          onChange={(e) => setNewAuctionOptions({ ...newAuctionOptions, keep_sold: e.target.checked })}
                        />
                      }
                      label="Keep sold players with teams"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newAuctionOptions.keep_retained}
                          onChange={(e) => setNewAuctionOptions({ ...newAuctionOptions, keep_retained: e.target.checked })}
                        />
                      }
                      label="Keep retained players"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newAuctionOptions.reset_teams}
                          onChange={(e) => setNewAuctionOptions({ ...newAuctionOptions, reset_teams: e.target.checked })}
                        />
                      }
                      label="Reset all teams to fresh state (⚠️ Clears everything)"
                    />
                  </Stack>
                </Paper>

                <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="white">
                    What will be CLEARED? (Automatic)
                  </Typography>
                  <Typography variant="body2" component="div" color="white">
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>✓ Clear auction pool players</li>
                      <li>✓ Clear all sets</li>
                      <li>✓ Clear bid history</li>
                      <li>✓ Clear RTM usage history</li>
                      <li>✓ Reset auction state to NOT_STARTED</li>
                    </ul>
                  </Typography>
                </Paper>

                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>After clicking confirm:</strong>
                    <br />• Upload new auction pool players
                    <br />• Generate new sets
                    <br />• Start auction from auctioneer dashboard
                  </Typography>
                </Alert>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button 
                onClick={() => setShowNewAuctionDialog(false)}
                disabled={startingNewAuction}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartNewAuction}
                disabled={startingNewAuction}
                startIcon={startingNewAuction ? <CircularProgress size={20} color="inherit" /> : <Restore />}
              >
                {startingNewAuction ? 'Starting...' : '✅ Confirm - Start New Auction'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ============================================ */}
          {/* DIALOG: TEAM CONFIGURATION */}
          {/* ============================================ */}
          <Dialog
            open={showTeamConfigDialog}
            onClose={() => setShowTeamConfigDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              ⚙️ Configure Team: {editingTeam?.team_name}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Max Overseas Players"
                  type="number"
                  fullWidth
                  value={teamConfigForm.max_overseas}
                  onChange={(e) => setTeamConfigForm({ ...teamConfigForm, max_overseas: parseInt(e.target.value) })}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={teamConfigForm.rtm_enabled}
                      onChange={(e) => setTeamConfigForm({ ...teamConfigForm, rtm_enabled: e.target.checked })}
                    />
                  }
                  label="Enable RTM for this team"
                />

                {teamConfigForm.rtm_enabled && (
                  <TextField
                    label="RTM Cards Available"
                    type="number"
                    fullWidth
                    value={teamConfigForm.rtm_cards}
                    onChange={(e) => setTeamConfigForm({ ...teamConfigForm, rtm_cards: parseInt(e.target.value) })}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowTeamConfigDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSaveTeamConfig}
              >
                Save Configuration
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
    </Box>
  );
};

export default AdminDashboard;