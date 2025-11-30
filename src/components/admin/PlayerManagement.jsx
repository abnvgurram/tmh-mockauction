// src/components/admin/PlayerManagement.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Upload,
  Add,
  Edit,
  Delete,
  Refresh,
  SportsCricket,
  Public,
  Person,
} from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';
import Papa from 'papaparse';

const PlayerManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add/Edit player dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [playerForm, setPlayerForm] = useState({
    name: '',
    category: 'batter',
    country: 'india',
    base_price: 0.30,
  });

  // Retained player dialog
  const [openRetainedDialog, setOpenRetainedDialog] = useState(false);
  const [retainedForm, setRetainedForm] = useState({
    player_id: '',
    team_id: '',
    retained_price: 0,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    auction_pool: 0,
    retained: 0,
    batters: 0,
    bowlers: 0,
    allrounders: 0,
    wicketkeepers: 0,
    india: 0,
    overseas: 0,
  });

  // Fetch players and teams
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          *,
          teams (
            team_name,
            team_code
          )
        `)
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;
      setPlayers(playersData || []);

      // Calculate stats
      const totalPlayers = playersData?.length || 0;
      const auctionPool = playersData?.filter(p => p.status === 'auction_pool').length || 0;
      const retained = playersData?.filter(p => p.status === 'retained').length || 0;
      const batters = playersData?.filter(p => p.category === 'batter').length || 0;
      const bowlers = playersData?.filter(p => p.category === 'bowler').length || 0;
      const allrounders = playersData?.filter(p => p.category === 'allrounder').length || 0;
      const wicketkeepers = playersData?.filter(p => p.category === 'wicketkeeper').length || 0;
      const india = playersData?.filter(p => p.country === 'india').length || 0;
      const overseas = playersData?.filter(p => p.country === 'overseas').length || 0;

      setStats({
        total: totalPlayers,
        auction_pool: auctionPool,
        retained: retained,
        batters,
        bowlers,
        allrounders,
        wicketkeepers,
        india,
        overseas,
      });

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('team_name', { ascending: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle CSV upload
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const playersToInsert = results.data.map(row => ({
            name: row.name,
            category: row.category.toLowerCase(),
            country: row.country.toLowerCase(),
            base_price: parseFloat(row.base_price),
            status: 'auction_pool',
            is_retained: false,
          }));

          const { error } = await supabase
            .from('players')
            .insert(playersToInsert);

          if (error) throw error;

          setSuccessMessage(`Successfully uploaded ${playersToInsert.length} players!`);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
          console.error('Error uploading CSV:', error);
          setErrorMessage('Failed to upload CSV. Check format and try again.');
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        setErrorMessage('Failed to parse CSV file');
      },
    });

    // Reset file input
    event.target.value = '';
  };

  // Open add player dialog
  const handleOpenAddDialog = () => {
    setEditingPlayer(null);
    setPlayerForm({
      name: '',
      category: 'batter',
      country: 'india',
      base_price: 0.30,
    });
    setOpenDialog(true);
  };

  // Open edit player dialog
  const handleOpenEditDialog = (player) => {
    setEditingPlayer(player);
    setPlayerForm({
      name: player.name,
      category: player.category,
      country: player.country,
      base_price: player.base_price,
    });
    setOpenDialog(true);
  };

  // Save player (add or edit)
  const handleSavePlayer = async () => {
    try {
      if (editingPlayer) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            name: playerForm.name,
            category: playerForm.category,
            country: playerForm.country,
            base_price: parseFloat(playerForm.base_price),
          })
          .eq('id', editingPlayer.id);

        if (error) throw error;
        setSuccessMessage('Player updated successfully!');
      } else {
        // Add new player
        const { error } = await supabase
          .from('players')
          .insert({
            name: playerForm.name,
            category: playerForm.category,
            country: playerForm.country,
            base_price: parseFloat(playerForm.base_price),
            status: 'auction_pool',
            is_retained: false,
          });

        if (error) throw error;
        setSuccessMessage('Player added successfully!');
      }

      setOpenDialog(false);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving player:', error);
      setErrorMessage('Failed to save player');
    }
  };

  // Delete player
  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      setSuccessMessage('Player deleted successfully!');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting player:', error);
      setErrorMessage('Failed to delete player');
    }
  };

  // Open retained player dialog
  const handleOpenRetainedDialog = (player = null) => {
    setRetainedForm({
      player_id: player?.id || '',
      team_id: '',
      retained_price: 0,
    });
    setOpenRetainedDialog(true);
  };

  // Assign retained player
  const handleAssignRetained = async () => {
    try {
      // Update player as retained
      const { error } = await supabase
        .from('players')
        .update({
          status: 'retained',
          is_retained: true,
          retained_price: parseFloat(retainedForm.retained_price),
          team_id: retainedForm.team_id,
        })
        .eq('id', retainedForm.player_id);

      if (error) throw error;

      // Update team stats and deduct retention amount
      const player = players.find(p => p.id === retainedForm.player_id);
      if (player) {
        const { error: teamError } = await supabase.rpc('update_team_on_retention', {
          team_id: retainedForm.team_id,
          player_category: player.category,
          player_country: player.country,
          retention_amount: parseFloat(retainedForm.retained_price),
        });

        if (teamError) console.error('Team stats update error:', teamError);
      }

      setSuccessMessage('Player assigned as retained successfully!');
      setOpenRetainedDialog(false);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error assigning retained player:', error);
      setErrorMessage('Failed to assign retained player');
    }
  };

  // Get filtered players based on tab
  const getFilteredPlayers = () => {
    if (currentTab === 0) return players; // All
    if (currentTab === 1) return players.filter(p => p.status === 'auction_pool');
    if (currentTab === 2) return players.filter(p => p.status === 'retained');
    return players;
  };

  return (
    <Box>
      <Stack spacing={4}>
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert severity="error" onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Stats Cards - REDESIGNED */}
        <Grid container spacing={2}>
          {/* Total Players Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={3}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                minHeight: 180,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Total Players
                      </Typography>
                      <Typography variant="h3" fontWeight="700">
                        {stats.total}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        p: 1.5,
                      }}
                    >
                      <SportsCricket sx={{ fontSize: 32 }} />
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="600">{stats.india}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>India</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="600">{stats.overseas}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>Overseas</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Auction Pool Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={3}
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                minHeight: 180,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Auction Pool
                      </Typography>
                      <Typography variant="h3" fontWeight="700">
                        {stats.auction_pool}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        p: 1.5,
                      }}
                    >
                      <Public sx={{ fontSize: 32 }} />
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Available for auction
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Retained Players Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={3}
              sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                minHeight: 180,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Retained Players
                      </Typography>
                      <Typography variant="h3" fontWeight="700">
                        {stats.retained}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        p: 1.5,
                      }}
                    >
                      <Person sx={{ fontSize: 32 }} />
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Already assigned to teams
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Categories Breakdown Card */}
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={3}
              sx={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                minHeight: 180,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={1.5}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
                    By Category
                  </Typography>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>🏏 Batters</Typography>
                    <Typography variant="h6" fontWeight="600">{stats.batters}</Typography>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>🎯 Bowlers</Typography>
                    <Typography variant="h6" fontWeight="600">{stats.bowlers}</Typography>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>⚡ All-rounders</Typography>
                    <Typography variant="h6" fontWeight="600">{stats.allrounders}</Typography>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>🧤 Wicket-keepers</Typography>
                    <Typography variant="h6" fontWeight="600">{stats.wicketkeepers}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAddDialog}
            >
              Add Player
            </Button>

            <Button
              variant="contained"
              component="label"
              startIcon={<Upload />}
              color="secondary"
            >
              Upload CSV
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleCSVUpload}
              />
            </Button>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchData}
            >
              Refresh
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            <Typography variant="body2" color="text.secondary" alignSelf="center">
              CSV Format: name, category, country, base_price
            </Typography>
          </Stack>
        </Paper>

        {/* Players Table */}
        <Paper elevation={2}>
          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
            <Tab label={`All Players (${stats.total})`} />
            <Tab label={`Auction Pool (${stats.auction_pool})`} />
            <Tab label={`Retained (${stats.retained})`} />
          </Tabs>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Country</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Base Price</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Team</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Loading...</TableCell>
                  </TableRow>
                ) : getFilteredPlayers().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No players found</TableCell>
                  </TableRow>
                ) : (
                  getFilteredPlayers().map((player) => (
                    <TableRow key={player.id} hover>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>
                        <Chip label={player.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={player.country.toUpperCase()}
                          size="small"
                          color={player.country === 'india' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>₹{player.base_price} Cr</TableCell>
                      <TableCell>
                        <Chip
                          label={player.status}
                          size="small"
                          color={player.status === 'retained' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {player.teams?.team_code?.toUpperCase() || '-'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEditDialog(player)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeletePlayer(player.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {player.status === 'auction_pool' && (
                            <Tooltip title="Mark as Retained">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setRetainedForm({ ...retainedForm, player_id: player.id });
                                  setOpenRetainedDialog(true);
                                }}
                              >
                                <Person fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      {/* Add/Edit Player Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPlayer ? 'Edit Player' : 'Add New Player'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Player Name"
              value={playerForm.name}
              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={playerForm.category}
                label="Category"
                onChange={(e) => setPlayerForm({ ...playerForm, category: e.target.value })}
              >
                <MenuItem value="batter">Batter</MenuItem>
                <MenuItem value="bowler">Bowler</MenuItem>
                <MenuItem value="allrounder">All-rounder</MenuItem>
                <MenuItem value="wicketkeeper">Wicket-keeper</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Country</InputLabel>
              <Select
                value={playerForm.country}
                label="Country"
                onChange={(e) => setPlayerForm({ ...playerForm, country: e.target.value })}
              >
                <MenuItem value="india">India</MenuItem>
                <MenuItem value="overseas">Overseas</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Base Price (Crores)"
              type="number"
              value={playerForm.base_price}
              onChange={(e) => setPlayerForm({ ...playerForm, base_price: e.target.value })}
              InputProps={{ inputProps: { min: 0.20, step: 0.10 } }}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSavePlayer}
            variant="contained"
            disabled={!playerForm.name || !playerForm.base_price}
          >
            {editingPlayer ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Retained Player Dialog */}
      <Dialog open={openRetainedDialog} onClose={() => setOpenRetainedDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Retained Player</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Team</InputLabel>
              <Select
                value={retainedForm.team_id}
                label="Team"
                onChange={(e) => setRetainedForm({ ...retainedForm, team_id: e.target.value })}
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.team_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Retention Amount (Crores)"
              type="number"
              value={retainedForm.retained_price}
              onChange={(e) => setRetainedForm({ ...retainedForm, retained_price: e.target.value })}
              InputProps={{ inputProps: { min: 0, step: 0.50 } }}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRetainedDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAssignRetained}
            variant="contained"
            disabled={!retainedForm.team_id || !retainedForm.retained_price}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlayerManagement;