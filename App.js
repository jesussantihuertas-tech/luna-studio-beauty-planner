
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/supabase';

const P = {
  bg: '#fff6fa',
  card: '#ffffff',
  pink: '#f7d9e8',
  rose: '#b65d86',
  deep: '#874568',
  ink: '#71475d',
  lilac: '#b7a0d8',
  line: '#efd2e0',
  muted: '#a1748c'
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

function Button({ title, onPress, secondary = false, disabled = false }) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: secondary ? P.pink : P.rose,
        padding: 14,
        borderRadius: 13,
        alignItems: 'center',
        opacity: disabled ? 0.55 : 1,
        marginTop: 8
      }}
    >
      <Text style={{
        color: secondary ? P.deep : 'white',
        fontWeight: '700'
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default'
}) {
  return (
    <View style={{ marginTop: 11 }}>
      <Text style={{
        color: P.rose,
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 5
      }}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: P.line,
          borderRadius: 11,
          padding: 12,
          color: P.ink,
          minHeight: multiline ? 76 : 45,
          textAlignVertical: multiline ? 'top' : 'center'
        }}
      />
    </View>
  );
}

function Pill({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 11,
        borderRadius: 12,
        backgroundColor: active ? P.rose : P.pink,
        marginRight: 8,
        marginTop: 8
      }}
    >
      <Text style={{
        color: active ? 'white' : P.deep,
        fontWeight: '700'
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Uñas');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [details, setDetails] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setAppointments([]);
      setLoading(false);
      return;
    }

    loadProfile();
  }, [session]);

  useEffect(() => {
    if (session && profile?.role === 'admin') {
      loadAppointments();
    }
  }, [session, profile?.role]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      Alert.alert('Perfil', 'No se pudo cargar el perfil: ' + error.message);
    }

    setProfile(data || null);
    setLoading(false);
    registerPushToken();
  }

  async function registerPushToken() {
    try {
      if (!Device.isDevice) return;

      const { status: existing } =
        await Notifications.getPermissionsAsync();

      let status = existing;

      if (status !== 'granted') {
        ({ status } = await Notifications.requestPermissionsAsync());
      }

      if (status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId || projectId.startsWith('REEMPLAZAR')) return;

      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;

      await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', session.user.id);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('citas', {
          name: 'Citas',
          importance: Notifications.AndroidImportance.MAX
        });
      }
    } catch (e) {
      console.log('Push token:', e.message);
    }
  }

  async function auth(mode) {
    if (!email.trim() || !password) {
      return Alert.alert(
        'Faltan datos',
        'Escribe correo y contraseña.'
      );
    }

    setBusy(true);

    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email: email.trim(),
          password
        })
      : await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

    setBusy(false);

    if (result.error) {
      Alert.alert('No se pudo continuar', result.error.message);
    } else if (mode === 'signup') {
      Alert.alert(
        'Cuenta creada',
        'Revisa tu correo si Supabase solicita confirmar la cuenta.'
      );
    }
  }

  async function loadAppointments() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date')
      .order('appointment_time');

    if (error) {
      Alert.alert('Citas', error.message);
    }

    setAppointments(data || []);
  }

  async function requestAppointment() {
    if (!fullName.trim() || !phone.trim() || !date || !time) {
      return Alert.alert(
        'Faltan datos',
        'Completa nombre, teléfono, fecha y hora.'
      );
    }

    setBusy(true);

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: session.user.id,
        client_name: fullName.trim(),
        phone: phone.trim(),
        service,
        appointment_date: date,
        appointment_time: time,
        details: details.trim(),
        status: 'pending'
      })
      .select()
      .single();

    if (!error) {
      const { error: notifyError } =
        await supabase.functions.invoke('notify-admins', {
          body: { appointment_id: data.id }
        });

      setBusy(false);
      setDate('');
      setTime('10:00');
      setDetails('');

      Alert.alert(
        'Solicitud enviada',
        'Fátima recibirá tu solicitud y deberá confirmarla.' +
        (notifyError
          ? ' La notificación push podría tardar; la solicitud quedó guardada.'
          : '')
      );
    } else {
      setBusy(false);
      Alert.alert(
        'No se pudo solicitar la cita',
        error.message
      );
    }
  }

  async function changeStatus(item, status) {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', item.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await loadAppointments();

      Alert.alert(
        status === 'accepted'
          ? 'Cita aceptada'
          : 'Solicitud rechazada',
        status === 'accepted'
          ? 'La cita quedó confirmada.'
          : 'La solicitud quedó rechazada.'
      );
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!supabase) {
    return (
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: P.bg,
        justifyContent: 'center',
        padding: 24
      }}>
        <Text style={{
          fontSize: 26,
          color: P.deep,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          ♡ Luna Studio Beauty Planner ♡
        </Text>

        <Text style={{
          color: P.ink,
          textAlign: 'center',
          marginTop: 12
        }}>
          Falta configurar Supabase. Sigue los pasos del archivo README incluido en este proyecto.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: P.bg
      }}>
        <ActivityIndicator color={P.rose} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: P.bg
      }}>
        <StatusBar style="dark" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{
            padding: 24,
            flexGrow: 1,
            justifyContent: 'center'
          }}>
            <Text style={{
              fontSize: 30,
              color: P.deep,
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              ♡ Luna Studio
            </Text>

            <Text style={{
              fontSize: 30,
              color: P.deep,
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Beauty Planner ♡
            </Text>

            <Text style={{
              textAlign: 'center',
              color: P.rose,
              letterSpacing: 2,
              marginTop: 7
            }}>
              NAILS · LASHES · LITTLE MOMENTS
            </Text>

            <View style={{
              backgroundColor: P.card,
              padding: 18,
              borderRadius: 20,
              marginTop: 26,
              borderWidth: 1,
              borderColor: P.line
            }}>
              <Text style={{
                fontSize: 20,
                color: P.deep,
                fontWeight: 'bold'
              }}>
                Inicia sesión o crea tu cuenta
              </Text>

              <Field
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
              />

              <Field
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
              />

              <Button
                title={busy ? 'Un momento...' : 'Iniciar sesión'}
                onPress={() => auth('login')}
                disabled={busy}
              />

              <Button
                title="Crear cuenta de clienta"
                secondary
                onPress={() => auth('signup')}
                disabled={busy}
              />
            </View>

            <Text style={{
              textAlign: 'center',
              color: P.muted,
              fontSize: 12,
              marginTop: 18
            }}>
              Tu cuenta te permitirá solicitar y consultar tus citas.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: P.bg
    }}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={{
        padding: 18,
        paddingBottom: 40
      }}>
        <Text style={{
          fontSize: 27,
          color: P.deep,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          ♡ Luna Studio Beauty Planner ♡
        </Text>

        <Text style={{
          textAlign: 'center',
          color: P.rose,
          marginTop: 4
        }}>
          {profile?.role === 'admin'
            ? 'PANEL DE FÁTIMA'
            : 'AGENDA TU CITA'}
        </Text>

        <View style={{
          backgroundColor: P.card,
          borderRadius: 18,
          padding: 16,
          marginTop: 18,
          borderWidth: 1,
          borderColor: P.line
        }}>
          {profile?.role === 'admin' ? (
            <>
              <Text style={{
                fontSize: 20,
                color: P.deep,
                fontWeight: 'bold'
              }}>
                Solicitudes de citas
              </Text>

              <Button
                title="Actualizar solicitudes"
                secondary
                onPress={loadAppointments}
              />

              {appointments.length === 0 ? (
                <Text style={{
                  color: P.muted,
                  marginTop: 18
                }}>
                  Todavía no hay solicitudes.
                </Text>
              ) : (
                appointments.map(item => (
                  <View key={item.id} style={{
                    padding: 13,
                    borderRadius: 13,
                    borderWidth: 1,
                    borderColor: P.line,
                    marginTop: 12
                  }}>
                    <Text style={{
                      color: P.deep,
                      fontWeight: 'bold',
                      fontSize: 16
                    }}>
                      {item.client_name}
                    </Text>

                    <Text style={{
                      color: P.ink,
                      marginTop: 4
                    }}>
                      {item.service} · {item.appointment_date} · {item.appointment_time}
                    </Text>

                    <Text style={{ color: P.ink }}>
                      Tel. {item.phone}
                    </Text>

                    {!!item.details && (
                      <Text style={{
                        color: P.muted,
                        marginTop: 4
                      }}>
                        {item.details}
                      </Text>
                    )}

                    <Text style={{
                      color: P.rose,
                      fontWeight: 'bold',
                      marginTop: 5
                    }}>
                      Estado: {
                        item.status === 'pending'
                          ? 'Pendiente'
                          : item.status === 'accepted'
                            ? 'Aceptada'
                            : 'Rechazada'
                      }
                    </Text>

                    {item.status === 'pending' && (
                      <View style={{
                        flexDirection: 'row',
                        gap: 8,
                        marginTop: 8
                      }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Aceptar"
                            onPress={() => changeStatus(item, 'accepted')}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Button
                            title="Rechazar"
                            secondary
                            onPress={() => changeStatus(item, 'rejected')}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              <Text style={{
                fontSize: 20,
                color: P.deep,
                fontWeight: 'bold'
              }}>
                Solicita tu cita
              </Text>

              <Field
                label="Nombre completo"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre"
              />

              <Field
                label="Teléfono / WhatsApp"
                value={phone}
                onChangeText={setPhone}
                placeholder="10 dígitos"
                keyboardType="phone-pad"
              />

              <Text style={{
                color: P.rose,
                fontWeight: '700',
                fontSize: 12,
                marginTop: 14
              }}>
                Servicio
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap'
              }}>
                <Pill
                  label="💅 Uñas"
                  active={service === 'Uñas'}
                  onPress={() => setService('Uñas')}
                />

                <Pill
                  label="👁️ Pestañas"
                  active={service === 'Pestañas'}
                  onPress={() => setService('Pestañas')}
                />
              </View>

              <Field
                label="Fecha (AAAA-MM-DD)"
                value={date}
                onChangeText={setDate}
                placeholder="2026-12-05"
              />

              <Field
                label="Hora (24 horas)"
                value={time}
                onChangeText={setTime}
                placeholder="10:00"
              />

              <Field
                label="Detalles / diseño"
                value={details}
                onChangeText={setDetails}
                placeholder="Diseño, técnica, retoque..."
                multiline
              />

              <Button
                title={busy ? 'Enviando...' : '♡ Solicitar cita'}
                onPress={requestAppointment}
                disabled={busy}
              />

              <Text style={{
                color: P.muted,
                fontSize: 12,
                marginTop: 10
              }}>
                La cita no queda confirmada hasta que Fátima la acepte.
              </Text>
            </>
          )}
        </View>

        <Button
          title="Cerrar sesión"
          secondary
          onPress={signOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
