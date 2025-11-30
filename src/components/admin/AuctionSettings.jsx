// src/components/admin/AuctionSettings.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Save,
  Refresh,
  Edit,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';

const AuctionSettings = () => {
  // Global settings
  const [globalSettings, setGlobalSettings] = useState({
    default_max_budget: 125.00,
    default_rtm_cards: 2,
    max_overseas_per_team: 8,
    max_team_size: 25,
    auction_year: 2025,
  });

  // Teams data
  const [teams, setTeams] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamEditValues, setTeamEditValues] = useState({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch auction config and teams
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch global config
      const { data: configData, error: configError } = await supabase
        .from('auction_config')
        .select('*')
        .single();

      if (configError) throw configError;
      if (configData) {
        setGlobalSettings({
          default_max_budget: configData.default_max_budget,
          default_rtm_cards: configData.default_rtm_cards,
          max_overseas_per_team: configData.max_overseas_per_team,
          max_team_size: configData.max_team_size,
          auction_year: configData.auction_year,
        });
      }

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('team_name', { ascending: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save global settings
  const handleSaveGlobalSettings = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('auction_config')
        .update({
          default_max_budget: parseFloat(globalSettings.default_max_budget),
          default_rtm_cards: parseInt(globalSettings.default_rtm_cards),
          max_overseas_per_team: parseInt(globalSettings.max_overseas_per_team),
          max_team_size: parseInt(globalSettings.max_team_size),
          auction_year: parseInt(globalSettings.auction_year),
          last_modified: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('auction_config').select('id').single()).data.id);

      if (error) throw error;

      setSuccessMessage('Global settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving global settings:', error);
      setErrorMessage('Failed to save global settings');
    } finally {
      setSaving(false);
    }
  };

  // Start editing team
  const handleEditTeam = (team) => {
    setEditingTeam(team.id);
    setTeamEditValues({
      max_budget: team.max_budget,
      rtm_cards: team.rtm_cards,
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTeam(null);
    setTeamEditValues({});
  };

  // Save team settings
  const handleSaveTeam = async (teamId) => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          max_budget: parseFloat(teamEditValues.max_budget),
          rtm_cards: parseInt(teamEditValues.rtm_cards),
        })
        .eq('id', teamId);

      if (error) throw error;

      setSuccessMessage('Team settings updated successfully!');
      setEditingTeam(null);
      setTeamEditValues({});
      fetchData(); // Refresh data
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving team settings:', error);
      setErrorMessage('Failed to save team settings');
    } finally {
      setSaving(false);
    }
  };

  // Apply global defaults to all teams
  const handleApplyDefaultsToAllTeams = async () => {
    if (!window.confirm('Apply global defaults to ALL teams? This will override individual team settings.')) {
      return;
    }

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          max_budget: parseFloat(globalSettings.default_max_budget),
          rtm_cards: parseInt(globalSettings.default_rtm_cards),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all teams

      if (error) throw error;

      setSuccessMessage('Global defaults applied to all teams!');
      fetchData(); // Refresh data
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error applying defaults:', error);
      setErrorMessage('Failed to apply defaults to all teams');
    } finally {
      setSaving(false);
    }
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

        {/* Global Settings Section */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h5" fontWeight="600">
                Global Auction Settings
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Default Max Budget (Crores)"
                type="number"
                value={globalSettings.default_max_budget}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_max_budget: e.target.value })}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Default RTM Cards"
                type="number"
                value={globalSettings.default_rtm_cards}
                onChange={(e) => setGlobalSettings({ ...globalSettings, default_rtm_cards: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Max Overseas Players"
                type="number"
                value={globalSettings.max_overseas_per_team}
                onChange={(e) => setGlobalSettings({ ...globalSettings, max_overseas_per_team: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Max Squad Size"
                type="number"
                value={globalSettings.max_team_size}
                onChange={(e) => setGlobalSettings({ ...globalSettings, max_team_size: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Auction Year"
                type="number"
                value={globalSettings.auction_year}
                onChange={(e) => setGlobalSettings({ ...globalSettings, auction_year: e.target.value })}
                InputProps={{ inputProps: { min: 2024 } }}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} mt={3}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveGlobalSettings}
              disabled={saving}
            >
              Save Global Settings
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleApplyDefaultsToAllTeams}
              disabled={saving}
            >
              Apply Defaults to All Teams
            </Button>
          </Stack>
        </Paper>

        {/* Team-Specific Settings Section */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight="600" mb={3}>
            Team-Specific Settings
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={2}>
            Customize budget and RTM cards for individual teams. Click the edit icon to modify.
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Team</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Code</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Max Budget (Cr)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Current Purse (Cr)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>RTM Cards</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Loading teams...</TableCell>
                  </TableRow>
                ) : teams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No teams found</TableCell>
                  </TableRow>
                ) : (
                  teams.map((team) => (
                    <TableRow key={team.id} hover>
                      <TableCell>{team.team_name}</TableCell>
                      <TableCell>
                        <Chip label={team.team_code.toUpperCase()} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {editingTeam === team.id ? (
                          <TextField
                            size="small"
                            type="number"
                            value={teamEditValues.max_budget}
                            onChange={(e) => setTeamEditValues({ ...teamEditValues, max_budget: e.target.value })}
                            InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                            sx={{ width: 120 }}
                          />
                        ) : (
                          `₹${team.max_budget}`
                        )}
                      </TableCell>
                      <TableCell>₹{team.current_purse}</TableCell>
                      <TableCell>
                        {editingTeam === team.id ? (
                          <TextField
                            size="small"
                            type="number"
                            value={teamEditValues.rtm_cards}
                            onChange={(e) => setTeamEditValues({ ...teamEditValues, rtm_cards: e.target.value })}
                            InputProps={{ inputProps: { min: 0 } }}
                            sx={{ width: 80 }}
                          />
                        ) : (
                          team.rtm_cards
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTeam === team.id ? (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleSaveTeam(team.id)}
                              disabled={saving}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        ) : (
                          <Tooltip title="Edit Team Settings">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditTeam(team)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    </Box>
  );
};

export default AuctionSettings;