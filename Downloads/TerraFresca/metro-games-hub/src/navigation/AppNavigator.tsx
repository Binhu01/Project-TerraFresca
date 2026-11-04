import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SkiaSpike } from '../shared/rendering/spike/SkiaSpike';
import { GLSpike } from '../shared/rendering/spike/GLSpike';

type RootStackParamList = {
  Home: undefined;
  SkiaSpike: undefined;
  GLSpike: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metro Games Hub</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('SkiaSpike')}
      >
        <Text style={styles.buttonText}>Skia Spike</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('GLSpike')}
      >
        <Text style={styles.buttonText}>expo-gl Spike</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SkiaSpike" component={SkiaSpike} options={{ title: 'Skia Spike' }} />
      <Stack.Screen name="GLSpike" component={GLSpike} options={{ title: 'expo-gl Spike' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});